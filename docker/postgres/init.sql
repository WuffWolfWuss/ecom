CREATE DATABASE ecom_users;
CREATE DATABASE ecom_orders;
CREATE DATABASE ecom_payments;
CREATE DATABASE ecom_inventory;

GRANT ALL PRIVILEGES ON DATABASE ecom_users TO ecom_user;
GRANT ALL PRIVILEGES ON DATABASE ecom_orders TO ecom_user;
GRANT ALL PRIVILEGES ON DATABASE ecom_payments TO ecom_user;
GRANT ALL PRIVILEGES ON DATABASE ecom_inventory TO ecom_user;