-- Database initialization script for Slate
-- This file will be executed when the Postgres container starts for the first time

-- Create database if it doesn't exist (though it should be created by docker-compose)
-- CREATE DATABASE slate_dev;

-- Grant permissions to the user
GRANT ALL PRIVILEGES ON DATABASE slate_dev TO slate_user;

-- Enable UUID extension (will be useful for our primary keys)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Log initialization
SELECT 'Database initialized successfully' AS message; 