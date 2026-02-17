TEST 'TON initial state Q=FALSE'
  VAR t : TON; END_VAR
  t(IN := FALSE, PT := T#1s);
  ASSERT_FALSE(t.Q);
END_TEST

TEST 'TOF initial state Q=FALSE'
  VAR t : TOF; END_VAR
  t(IN := FALSE, PT := T#1s);
  ASSERT_FALSE(t.Q);
END_TEST

TEST 'TP initial state Q=FALSE'
  VAR t : TP; END_VAR
  t(IN := FALSE, PT := T#1s);
  ASSERT_FALSE(t.Q);
END_TEST
