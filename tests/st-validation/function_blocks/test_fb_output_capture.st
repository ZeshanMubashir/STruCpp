TEST 'FB output capture with => syntax'
  VAR calc : Calculator; mySum, myProduct : INT; END_VAR
  calc(a := 5, b := 3, sum => mySum, product => myProduct);
  ASSERT_EQ(mySum, 8);
  ASSERT_EQ(myProduct, 15);
END_TEST
