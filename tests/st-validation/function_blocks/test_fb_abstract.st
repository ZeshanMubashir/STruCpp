TEST 'Concrete class computes area'
  VAR c : Circle; END_VAR
  c(radius := 2.0);
  ASSERT_NEAR(c.area, 12.566, 0.01);
END_TEST
