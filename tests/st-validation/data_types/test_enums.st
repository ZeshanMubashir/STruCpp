TEST 'Enum type declarations compile and program runs'
  VAR uut : EnumTest; END_VAR
  uut();
  ASSERT_TRUE(uut.lightDeclared);
  ASSERT_TRUE(uut.stateDeclared);
END_TEST
