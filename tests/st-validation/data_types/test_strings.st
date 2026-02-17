TEST 'Double-quotes inside string preserved'
  VAR sh : StringHolder; END_VAR
  sh();
  ASSERT_EQ(sh.dblQuoteLen, 11);
END_TEST

TEST 'Doubled single-quotes become apostrophe'
  VAR sh : StringHolder; END_VAR
  sh();
  ASSERT_EQ(sh.apostropheLen, 12);
END_TEST

TEST 'Backslashes preserved in string'
  VAR sh : StringHolder; END_VAR
  sh();
  ASSERT_EQ(sh.backslashLen, 15);
END_TEST
