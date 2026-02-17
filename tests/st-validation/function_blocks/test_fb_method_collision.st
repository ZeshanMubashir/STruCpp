TEST 'Two FBs with same method name dispatch correctly'
  VAR a : Adder; d : Doubler; r1, r2 : INT; END_VAR
  a.x := 5;
  d.x := 5;
  r1 := a.Compute();
  r2 := d.Compute();
  ASSERT_EQ(r1, 105);
  ASSERT_EQ(r2, 10);
END_TEST
