TEST 'FINAL FB computes correctly'
  VAR s : SealedFB; END_VAR
  s(x := 42);
  ASSERT_EQ(s.y, 43);
END_TEST
