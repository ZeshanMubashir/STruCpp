#include <arpa/inet.h>
#include <netinet/in.h>
#include <sys/socket.h>
#include <unistd.h>

#include <cerrno>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <iostream>
#include <sstream>
#include <string>

#include "unity_conveyor_controller.hpp"

namespace {

struct IoFrame {
    int startPB = 0;
    int stopPB = 0;
    int jamSensor = 0;
    int resetPB = 0;
    int eStopOK = 1;
    int guardDoorClosed = 1;
};

bool parse_frame(const std::string& line, IoFrame& out) {
    // Protocol: start,stop,jam,reset,estop,guard
    char c1 = 0;
    char c2 = 0;
    char c3 = 0;
    char c4 = 0;
    char c5 = 0;
    std::istringstream iss(line);
    if (!(iss >> out.startPB >> c1 >> out.stopPB >> c2 >> out.jamSensor >> c3 >>
          out.resetPB >> c4 >> out.eStopOK >> c5 >> out.guardDoorClosed)) {
      return false;
    }
    return c1 == ',' && c2 == ',' && c3 == ',' && c4 == ',' && c5 == ',';
}

struct AxisState {
    double pos = 0.0;
    double vel = 0.0;
    double target = 0.0;
    double cmdVel = 0.0;
};

struct SortingMachineSim {
    AxisState x;
    AxisState y;
    AxisState z;
    AxisState cam;

    int serviceState = 0;
    int objectId = 0;
    int objectType = 0;  // 1=SMC, 2=BR, 10=ERR
    int mainCounter = 0;
    int brCounter = 0;
    int smcCounter = 0;
    int waitCounter = 0;

    bool attach = false;
    bool detach = false;
    bool scan = false;
    bool reset = false;
    bool ready = false;
    bool alarm = false;
    bool jamActive = false;
    bool motorOn = false;

    static constexpr double dt = 0.01;  // 10 ms

    static constexpr int OBJ_TYPE_SMC = 1;
    static constexpr int OBJ_TYPE_BR = 2;
    static constexpr int OBJ_TYPE_ERR = 10;

    static constexpr double HOME_POS = 0.0;
    static constexpr double INIT_PAD_OFFSET_X = 345.0;
    static constexpr double INIT_PAD_OFFSET_Y = 660.0;
    static constexpr double INIT_PAD_OFFSET_Z = 1255.0;
    static constexpr double INIT_CC_OFFSET_X = 6425.0;
    static constexpr double INIT_CC_OFFSET_Y = 2960.0;
    static constexpr double INIT_CC_OFFSET_Z = 1072.0;
    static constexpr double INIT_BRW_OFFSET_X = 2895.0;
    static constexpr double INIT_BRW_OFFSET_Y = 4060.0;
    static constexpr double INIT_BRW_OFFSET_Z = 1255.0;
    static constexpr double INIT_SMCW_OFFSET_X = 395.0;
    static constexpr double INIT_SMCW_OFFSET_Y = 4060.0;
    static constexpr double INIT_SMCW_OFFSET_Z = 1255.0;
    static constexpr double INIT_CC_MAIN_OFFSET_X = 3500.0;

    static bool at_target(double p, double t) { return std::fabs(p - t) < 1e-3; }

    static void drive_axis(AxisState& a) {
        const double delta = a.target - a.pos;
        const double maxStep = std::max(a.cmdVel, 1.0) * dt;
        if (std::fabs(delta) <= maxStep) {
            a.pos = a.target;
            a.vel = 0.0;
            return;
        }
        a.pos += (delta > 0.0 ? maxStep : -maxStep);
        a.vel = (delta > 0.0 ? a.cmdVel : -a.cmdVel);
    }

    static int classify_object(int id, bool jamSensor) {
        // Match original Unity/B&R camera classification table:
        // [1, 2, 1, 2, 10, 2, 1, 2, 1]
        // 1=SMC(blue), 2=BR(orange), 10=ERR(red/trash)
        static const int objClass[9] = {1, 2, 1, 2, 10, 2, 1, 2, 1};
        if (jamSensor) {
            return OBJ_TYPE_ERR;
        }
        if (id < 0 || id > 8) {
            return OBJ_TYPE_ERR;
        }
        return objClass[id];
    }

    void step(bool startPB, bool jamSensor, bool resetPB, bool eStopOK,
              bool guardDoorClosed) {
        const bool safetyOK = eStopOK && guardDoorClosed;
        ready = safetyOK;
        alarm = !safetyOK;
        jamActive = jamSensor && serviceState >= 4 && serviceState <= 61;
        motorOn = safetyOK && serviceState >= 4 && serviceState <= 61;
        reset = resetPB;

        attach = false;
        detach = false;
        scan = false;

        x.cmdVel = 3500.0;
        y.cmdVel = 2500.0;
        z.cmdVel = 2000.0;
        cam.cmdVel = 2500.0;

        if (!safetyOK) {
            serviceState = 1;
        }

        switch (serviceState) {
            case 0: {
                if (safetyOK) serviceState = 1;
                break;
            }
            case 1: {
                if (safetyOK) serviceState = 2;
                break;
            }
            case 2: {
                if (safetyOK) serviceState = 3;
                break;
            }
            case 3: {
                if (startPB) serviceState = 4;
                break;
            }
            case 4: {
                static const double offx[9] = {0, 0, 0, 600, 600, 600, 1200, 1200,
                                               1200};
                static const double offy[9] = {0, 800, 1600, 0, 800, 1600, 0, 800,
                                               1600};
                x.target = INIT_PAD_OFFSET_X + offx[objectId];
                y.target = INIT_PAD_OFFSET_Y + offy[objectId];
                z.target = HOME_POS;
                cam.target = HOME_POS;
                if (at_target(x.pos, x.target) && at_target(y.pos, y.target) &&
                    at_target(z.pos, z.target) && at_target(cam.pos, cam.target)) {
                    serviceState = 5;
                }
                break;
            }
            case 5: {
                z.target = INIT_PAD_OFFSET_Z;
                if (at_target(z.pos, z.target)) serviceState = 6;
                break;
            }
            case 6: {
                attach = true;
                waitCounter++;
                if (waitCounter >= 100) {
                    waitCounter = 0;
                    serviceState = 7;
                }
                break;
            }
            case 7: {
                z.target = HOME_POS;
                if (at_target(z.pos, z.target)) serviceState = 8;
                break;
            }
            case 8: {
                x.target = INIT_CC_OFFSET_X;
                y.target = INIT_CC_OFFSET_Y;
                if (at_target(x.pos, x.target) && at_target(y.pos, y.target)) {
                    serviceState = 9;
                }
                break;
            }
            case 9: {
                z.target = INIT_CC_OFFSET_Z;
                if (at_target(z.pos, z.target)) serviceState = 10;
                break;
            }
            case 10: {
                detach = true;
                waitCounter++;
                if (waitCounter >= 100) {
                    waitCounter = 0;
                    serviceState = 11;
                }
                break;
            }
            case 11: {
                z.target = HOME_POS;
                cam.target = INIT_CC_MAIN_OFFSET_X;
                if (at_target(z.pos, z.target) && at_target(cam.pos, cam.target)) {
                    serviceState = 12;
                }
                break;
            }
            case 12: {
                scan = true;
                waitCounter++;
                if (waitCounter >= 50) {
                    waitCounter = 0;
                    objectType = classify_object(objectId, jamSensor);
                    serviceState = 13;
                }
                break;
            }
            case 13: {
                cam.target = HOME_POS;
                if (at_target(cam.pos, cam.target)) serviceState = 14;
                break;
            }
            case 14: {
                z.target = INIT_CC_OFFSET_Z;
                if (at_target(z.pos, z.target)) serviceState = 15;
                break;
            }
            case 15: {
                attach = true;
                waitCounter++;
                if (waitCounter >= 100) {
                    waitCounter = 0;
                    serviceState = 16;
                }
                break;
            }
            case 16: {
                z.target = HOME_POS;
                if (at_target(z.pos, z.target)) serviceState = 17;
                break;
            }
            case 17: {
                if (objectType == OBJ_TYPE_ERR) {
                    serviceState = 20;
                } else if (objectType == OBJ_TYPE_BR) {
                    serviceState = 30;
                } else {
                    serviceState = 40;
                }
                break;
            }
            case 20: {
                x.target = 3500.0;
                y.target = 1750.0;
                if (at_target(x.pos, x.target) && at_target(y.pos, y.target)) {
                    serviceState = 21;
                }
                break;
            }
            case 21: {
                z.target = 1000.0;
                if (at_target(z.pos, z.target)) serviceState = 22;
                break;
            }
            case 22: {
                detach = true;
                waitCounter++;
                if (waitCounter >= 100) {
                    waitCounter = 0;
                    serviceState = 23;
                }
                break;
            }
            case 23: {
                z.target = HOME_POS;
                if (at_target(z.pos, z.target)) serviceState = 50;
                break;
            }
            case 30: {
                static const double offx[4] = {0, 0, 600, 600};
                static const double offy[4] = {0, 800, 0, 800};
                const int idx = std::min(brCounter, 3);
                x.target = INIT_BRW_OFFSET_X + offx[idx];
                y.target = INIT_BRW_OFFSET_Y + offy[idx];
                if (at_target(x.pos, x.target) && at_target(y.pos, y.target)) {
                    serviceState = 31;
                }
                break;
            }
            case 31: {
                z.target = INIT_BRW_OFFSET_Z;
                if (at_target(z.pos, z.target)) serviceState = 32;
                break;
            }
            case 32: {
                detach = true;
                waitCounter++;
                if (waitCounter >= 100) {
                    waitCounter = 0;
                    serviceState = 33;
                }
                break;
            }
            case 33: {
                z.target = HOME_POS;
                if (at_target(z.pos, z.target)) {
                    brCounter = std::min(brCounter + 1, 4);
                    serviceState = 50;
                }
                break;
            }
            case 40: {
                static const double offx[4] = {0, 0, 600, 600};
                static const double offy[4] = {0, 800, 0, 800};
                const int idx = std::min(smcCounter, 3);
                x.target = INIT_SMCW_OFFSET_X + offx[idx];
                y.target = INIT_SMCW_OFFSET_Y + offy[idx];
                if (at_target(x.pos, x.target) && at_target(y.pos, y.target)) {
                    serviceState = 41;
                }
                break;
            }
            case 41: {
                z.target = INIT_SMCW_OFFSET_Z;
                if (at_target(z.pos, z.target)) serviceState = 42;
                break;
            }
            case 42: {
                detach = true;
                waitCounter++;
                if (waitCounter >= 100) {
                    waitCounter = 0;
                    serviceState = 43;
                }
                break;
            }
            case 43: {
                z.target = HOME_POS;
                if (at_target(z.pos, z.target)) {
                    smcCounter = std::min(smcCounter + 1, 4);
                    serviceState = 50;
                }
                break;
            }
            case 50: {
                mainCounter++;
                if (mainCounter < 9) {
                    serviceState = 51;
                } else {
                    serviceState = 60;
                }
                break;
            }
            case 51: {
                objectId = std::min(mainCounter, 8);
                waitCounter++;
                if (waitCounter >= 50) {
                    waitCounter = 0;
                    serviceState = 4;
                }
                break;
            }
            case 60: {
                mainCounter = 0;
                brCounter = 0;
                smcCounter = 0;
                objectId = 0;
                x.target = INIT_PAD_OFFSET_X;
                y.target = INIT_PAD_OFFSET_Y;
                if (at_target(x.pos, x.target) && at_target(y.pos, y.target)) {
                    serviceState = 61;
                }
                break;
            }
            case 61: {
                if (startPB) serviceState = 4;
                break;
            }
            default:
                serviceState = 3;
                break;
        }

        drive_axis(x);
        drive_axis(y);
        drive_axis(z);
        drive_axis(cam);
    }
};

void run_client(int client_fd) {
    strucpp::UNITYCONVEYORCONTROLLER controller;
    SortingMachineSim sim;
    std::string pending;

    char buffer[1024];
    while (true) {
        const ssize_t n = recv(client_fd, buffer, sizeof(buffer), 0);
        if (n <= 0) {
            return;
        }
        pending.append(buffer, static_cast<size_t>(n));

        size_t nl = std::string::npos;
        while ((nl = pending.find('\n')) != std::string::npos) {
            std::string line = pending.substr(0, nl);
            pending.erase(0, nl + 1);

            IoFrame io;
            if (!parse_frame(line, io)) {
                const std::string err = "ERR\n";
                send(client_fd, err.c_str(), err.size(), 0);
                continue;
            }

            controller.STARTPB = io.startPB != 0;
            controller.STOPPB = io.stopPB != 0;
            controller.JAMSENSOR = io.jamSensor != 0;
            controller.RESETPB = io.resetPB != 0;
            controller.ESTOPOK = io.eStopOK != 0;
            controller.GUARDDOORCLOSED = io.guardDoorClosed != 0;
            controller();
            sim.step(controller.STARTPB, controller.JAMSENSOR, controller.RESETPB,
                     controller.ESTOPOK, controller.GUARDDOORCLOSED);

            std::ostringstream out;
            // Response:
            // motor,alarm,jam,ready,cam_pos,cam_vel,x,y,z,attach,detach,scan,obj_id,obj_type,state
            out << (controller.MOTORON ? 1 : 0) << ','
                << (controller.ALARM ? 1 : 0) << ','
                << (controller.JAMACTIVE ? 1 : 0) << ','
                << (controller.READY ? 1 : 0) << ',' << sim.cam.pos << ','
                << sim.cam.vel << ',' << sim.x.pos << ',' << sim.y.pos << ','
                << sim.z.pos << ',' << (sim.attach ? 1 : 0) << ','
                << (sim.detach ? 1 : 0) << ',' << (sim.scan ? 1 : 0) << ','
                << sim.objectId << ',' << sim.objectType << ',' << sim.serviceState
                << '\n';
            const std::string msg = out.str();
            send(client_fd, msg.c_str(), msg.size(), 0);
        }
    }
}

}  // namespace

int main(int argc, char** argv) {
    int port = 9100;
    if (argc == 2) {
        port = std::atoi(argv[1]);
    }

    const int server_fd = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd < 0) {
        std::cerr << "socket() failed: " << std::strerror(errno) << '\n';
        return 1;
    }

    int opt = 1;
    if (setsockopt(server_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) < 0) {
        std::cerr << "setsockopt() failed: " << std::strerror(errno) << '\n';
        close(server_fd);
        return 1;
    }

    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    addr.sin_port = htons(static_cast<uint16_t>(port));
    addr.sin_addr.s_addr = INADDR_ANY;

    if (bind(server_fd, reinterpret_cast<sockaddr*>(&addr), sizeof(addr)) < 0) {
        std::cerr << "bind() failed: " << std::strerror(errno) << '\n';
        close(server_fd);
        return 1;
    }

    if (listen(server_fd, 1) < 0) {
        std::cerr << "listen() failed: " << std::strerror(errno) << '\n';
        close(server_fd);
        return 1;
    }

    std::cout << "unity_conveyor_tcp_server listening on 127.0.0.1:" << port
              << '\n';
    while (true) {
        const int client_fd = accept(server_fd, nullptr, nullptr);
        if (client_fd < 0) {
            std::cerr << "accept() failed: " << std::strerror(errno) << '\n';
            continue;
        }
        std::cout << "client connected\n";
        run_client(client_fd);
        close(client_fd);
        std::cout << "client disconnected\n";
    }
}
