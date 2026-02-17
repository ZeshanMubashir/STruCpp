TEST 'CTU counts up on rising edges'
  VAR c : CTU; cv1, cv2, cv3 : INT; q_before, q_after : BOOL; END_VAR
  (* Rising edge 1: CU FALSE->TRUE *)
  c(CU := TRUE, R := FALSE, PV := 3);
  cv1 := c.CV;
  (* No edge: CU stays TRUE *)
  c(CU := TRUE, R := FALSE, PV := 3);
  cv2 := c.CV;
  (* Toggle for second rising edge *)
  c(CU := FALSE, R := FALSE, PV := 3);
  c(CU := TRUE, R := FALSE, PV := 3);
  cv3 := c.CV;
  q_before := c.Q;
  (* Third rising edge to reach PV=3 *)
  c(CU := FALSE, R := FALSE, PV := 3);
  c(CU := TRUE, R := FALSE, PV := 3);
  q_after := c.Q;
  ASSERT_EQ(cv1, 1);
  ASSERT_EQ(cv2, 1);
  ASSERT_EQ(cv3, 2);
  ASSERT_FALSE(q_before);
  ASSERT_TRUE(q_after);
END_TEST

TEST 'CTU reset with R=TRUE'
  VAR c : CTU; cv_counted, cv_reset : INT; q_reset : BOOL; END_VAR
  c(CU := TRUE, R := FALSE, PV := 5);
  cv_counted := c.CV;
  c(CU := FALSE, R := TRUE, PV := 5);
  cv_reset := c.CV;
  q_reset := c.Q;
  ASSERT_EQ(cv_counted, 1);
  ASSERT_EQ(cv_reset, 0);
  ASSERT_FALSE(q_reset);
END_TEST

TEST 'CTD loads PV and counts down on falling edges'
  VAR c : CTD; cv_loaded, cv1, cv2 : INT; q_before, q_after : BOOL; END_VAR
  c(CD := FALSE, LD := TRUE, PV := 2);
  cv_loaded := c.CV;
  (* Falling edge: CD TRUE->FALSE *)
  c(CD := TRUE, LD := FALSE, PV := 2);
  c(CD := FALSE, LD := FALSE, PV := 2);
  cv1 := c.CV;
  q_before := c.Q;
  (* Another falling edge *)
  c(CD := TRUE, LD := FALSE, PV := 2);
  c(CD := FALSE, LD := FALSE, PV := 2);
  cv2 := c.CV;
  q_after := c.Q;
  ASSERT_EQ(cv_loaded, 2);
  ASSERT_EQ(cv1, 1);
  ASSERT_EQ(cv2, 0);
  ASSERT_FALSE(q_before);
  ASSERT_TRUE(q_after);
END_TEST

TEST 'CTUD counts up and down independently'
  VAR c : CTUD; cv_init, cv1, cv2, cv3 : INT; qu_final, qd_final : BOOL; END_VAR
  (* Init: set CD=TRUE so F_TRIG M state is established *)
  c(CU := FALSE, CD := TRUE, R := FALSE, LD := FALSE, PV := 3);
  cv_init := c.CV;
  (* Count up: CU rising edge *)
  c(CU := TRUE, CD := TRUE, R := FALSE, LD := FALSE, PV := 3);
  cv1 := c.CV;
  (* Count up again: toggle CU *)
  c(CU := FALSE, CD := TRUE, R := FALSE, LD := FALSE, PV := 3);
  c(CU := TRUE, CD := TRUE, R := FALSE, LD := FALSE, PV := 3);
  cv2 := c.CV;
  (* Count down: CD falling edge *)
  c(CU := FALSE, CD := FALSE, R := FALSE, LD := FALSE, PV := 3);
  cv3 := c.CV;
  qu_final := c.QU;
  qd_final := c.QD;
  ASSERT_EQ(cv_init, 0);
  ASSERT_EQ(cv1, 1);
  ASSERT_EQ(cv2, 2);
  ASSERT_EQ(cv3, 1);
  ASSERT_FALSE(qu_final);
  ASSERT_FALSE(qd_final);
END_TEST

TEST 'CTU_DINT with large PV'
  VAR c : CTU_DINT; cv1, cv2 : DINT; q_result : BOOL; END_VAR
  c(CU := TRUE, R := FALSE, PV := 100000);
  cv1 := c.CV;
  c(CU := FALSE, R := FALSE, PV := 100000);
  c(CU := TRUE, R := FALSE, PV := 100000);
  cv2 := c.CV;
  q_result := c.Q;
  ASSERT_EQ(cv1, 1);
  ASSERT_EQ(cv2, 2);
  ASSERT_FALSE(q_result);
END_TEST
