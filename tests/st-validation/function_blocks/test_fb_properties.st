TEST 'Property setter and getter work'
  VAR m : MotorProp; x : INT; END_VAR
  m.Speed := 75;
  x := m.Speed;
  ASSERT_EQ(x, 75);
END_TEST

TEST 'Property setter clamps above threshold'
  VAR m : MotorProp; x : INT; END_VAR
  m.Speed := 200;
  x := m.Speed;
  ASSERT_EQ(x, 100);
END_TEST
