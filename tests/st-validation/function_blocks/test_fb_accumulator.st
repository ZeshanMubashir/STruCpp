TEST 'Accumulator preserves state across calls'
  VAR acc : AccumulatorFB; END_VAR
  acc(inc := 3);
  ASSERT_EQ(acc.result, 3);
  acc(inc := 3);
  ASSERT_EQ(acc.result, 6);
  acc(inc := 3);
  ASSERT_EQ(acc.result, 9);
END_TEST
