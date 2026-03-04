(* 
 * Unity Conveyor Controller Example
 *
 * Purpose:
 * - Run as a virtual PLC controller for a Unity digital twin.
 * - Inputs/outputs are plain BOOL tags that map cleanly to Unity C#.
 *
 * Scan assumptions:
 * - Controller cycle is 10 ms.
 * - Jam timeout is 2.0 s => 200 cycles.
 *)

FUNCTION_BLOCK UnityConveyorController
  VAR_INPUT
    StartPB : BOOL;      (* Start pushbutton *)
    StopPB : BOOL;       (* Stop pushbutton *)
    JamSensor : BOOL;    (* True while conveyor is jammed *)
    ResetPB : BOOL;      (* Reset alarm pushbutton *)
    EStopOK : BOOL;      (* Emergency chain healthy *)
    GuardDoorClosed : BOOL; (* Safety guard status *)
  END_VAR

  VAR_OUTPUT
    MotorOn : BOOL;      (* Conveyor motor command *)
    Alarm : BOOL;        (* General alarm status *)
    JamActive : BOOL;    (* Jam timeout reached *)
    Ready : BOOL;        (* Machine can start/run *)
  END_VAR

  VAR
    runRequest : BOOL;
    jamCounter : UINT;
    safetyOK : BOOL;
  END_VAR

  safetyOK := EStopOK AND GuardDoorClosed;
  Ready := safetyOK AND NOT Alarm;

  (* Latch run command *)
  IF StartPB AND Ready THEN
    runRequest := TRUE;
  END_IF;

  (* Stop conditions clear run request *)
  IF StopPB OR NOT safetyOK OR JamActive THEN
    runRequest := FALSE;
  END_IF;

  (* Jam monitoring while conveyor is requested to run *)
  IF runRequest AND JamSensor THEN
    IF jamCounter < 200 THEN
      jamCounter := jamCounter + 1;
    END_IF;
  ELSE
    jamCounter := 0;
  END_IF;

  IF jamCounter >= 200 THEN
    JamActive := TRUE;
  END_IF;

  (* Alarm handling *)
  IF JamActive OR NOT safetyOK THEN
    Alarm := TRUE;
  END_IF;

  IF ResetPB AND safetyOK AND NOT JamSensor THEN
    JamActive := FALSE;
    Alarm := FALSE;
    jamCounter := 0;
  END_IF;

  MotorOn := runRequest AND safetyOK AND NOT Alarm;
END_FUNCTION_BLOCK
