// test-config.js
// Centralized test fixture configuration.
//
// These are LOCAL DEV TEST ACCOUNTS ONLY — they exist solely in the local
// PostgreSQL dev database and are created by the test scripts themselves.
// They are NOT real user credentials and carry no security risk.

module.exports = {
  BASE: { hostname: 'localhost', port: 5000 },

  // Primary test user (project owner)
  TEST_USER: {
    email: 'autotest@connect.dev',
    password: 'Test_P@ssw0rd_Dev_Only',
    full_name: 'Auto Tester',
    institution: 'IIT Bombay',
  },

  // Secondary test user (applicant)
  TEST_APPLICANT: {
    email: 'applicant@connect.dev',
    password: 'Test_P@ssw0rd_Dev_Only',
    full_name: 'Applicant User',
    institution: 'NIT Trichy',
  },
};
