TEST 'Method in Outer calls Inner.GetVal()'
  VAR ctrl : Outer; result : INT; END_VAR
  ctrl.m.seed := 10;
  ctrl.m.val := 5;
  result := ctrl.ReadInner();
  ASSERT_EQ(result, 15);
END_TEST
