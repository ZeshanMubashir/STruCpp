TEST 'MyInt alias works like INT'
  VAR uut : TypeAliasTest; END_VAR
  uut();
  ASSERT_EQ(uut.intResult, 50);
END_TEST

TEST 'MyReal alias works like REAL'
  VAR uut : TypeAliasTest; END_VAR
  uut();
  ASSERT_NEAR(uut.realResult, 6.28, 0.01);
END_TEST
