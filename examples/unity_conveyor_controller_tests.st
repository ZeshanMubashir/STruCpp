TEST 'Conveyor starts when safety is healthy'
  VAR ctrl : UnityConveyorController; END_VAR
  ctrl.EStopOK := TRUE;
  ctrl.GuardDoorClosed := TRUE;
  ctrl.StartPB := TRUE;
  ctrl();
  ASSERT_TRUE(ctrl.MotorOn);
  ASSERT_FALSE(ctrl.Alarm);
END_TEST

TEST 'Stop button stops conveyor'
  VAR ctrl : UnityConveyorController; END_VAR
  ctrl.EStopOK := TRUE;
  ctrl.GuardDoorClosed := TRUE;
  ctrl.StartPB := TRUE;
  ctrl();
  ASSERT_TRUE(ctrl.MotorOn);

  ctrl.StartPB := FALSE;
  ctrl.StopPB := TRUE;
  ctrl();
  ASSERT_FALSE(ctrl.MotorOn);
END_TEST

TEST 'Jam alarm trips after 2 seconds at 10 ms scan'
  VAR
    ctrl : UnityConveyorController;
    i : UINT;
  END_VAR

  ctrl.EStopOK := TRUE;
  ctrl.GuardDoorClosed := TRUE;
  ctrl.StartPB := TRUE;
  ctrl();
  ctrl.StartPB := FALSE;
  ASSERT_TRUE(ctrl.MotorOn);

  ctrl.JamSensor := TRUE;
  FOR i := 1 TO 200 DO
    ctrl();
  END_FOR;

  ASSERT_TRUE(ctrl.JamActive);
  ASSERT_TRUE(ctrl.Alarm);
  ASSERT_FALSE(ctrl.MotorOn);
END_TEST

TEST 'Reset clears jam alarm when jam is removed'
  VAR
    ctrl : UnityConveyorController;
    i : UINT;
  END_VAR

  ctrl.EStopOK := TRUE;
  ctrl.GuardDoorClosed := TRUE;
  ctrl.StartPB := TRUE;
  ctrl();
  ctrl.StartPB := FALSE;
  ctrl.JamSensor := TRUE;

  FOR i := 1 TO 200 DO
    ctrl();
  END_FOR;

  ASSERT_TRUE(ctrl.Alarm);

  ctrl.JamSensor := FALSE;
  ctrl.ResetPB := TRUE;
  ctrl();
  ASSERT_FALSE(ctrl.Alarm);
  ASSERT_FALSE(ctrl.JamActive);
  ASSERT_FALSE(ctrl.MotorOn);

  ctrl.ResetPB := FALSE;
  ctrl.StartPB := TRUE;
  ctrl();
  ASSERT_TRUE(ctrl.MotorOn);
END_TEST
