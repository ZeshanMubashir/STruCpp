TYPE
  TrafficLight : (RED, YELLOW, GREEN);
  MachineState : INT (IDLE := 0, RUNNING := 1, STOPPED := 2);
END_TYPE

PROGRAM EnumTest
  VAR
    lightDeclared : BOOL;
    stateDeclared : BOOL;
  END_VAR
  lightDeclared := TRUE;
  stateDeclared := TRUE;
END_PROGRAM
