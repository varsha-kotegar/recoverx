-- RecoverX Demo Database Dump
CREATE TABLE users (id INT PRIMARY KEY, username VARCHAR(50), role VARCHAR(20));
CREATE TABLE audit_logs (id INT PRIMARY KEY, event VARCHAR(100), timestamp DATETIME);
INSERT INTO users VALUES (1, 'sysadmin', 'superadmin'), (2, 'support_agent', 'operator');
