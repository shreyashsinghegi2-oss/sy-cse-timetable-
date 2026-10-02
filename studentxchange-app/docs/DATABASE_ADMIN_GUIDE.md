# Database Administration Guide - StudentXchange

## Creating Admin Users

### Method 1: Direct Database Insert (Recommended for initial setup)
```sql
INSERT INTO users (username, password, email, phone) 
VALUES ('admin2', 'securepassword123', 'admin2@studentxchange.in', '7039862086');
```

### Method 2: Through Registration Form
1. Register a new user normally through the website
2. Update their username/email to include "admin" to grant admin privileges
```sql
UPDATE users SET username = 'admin_john', email = 'admin_john@studentxchange.in' WHERE id = [user_id];
```

### Method 3: Programmatic Creation (For bulk admin users)
Use the server API endpoint `/api/register` with admin credentials

## Admin Access Rules
- Users with "admin" in their username OR email get admin dashboard access
- Current admin detection logic: `user?.username === "admin" || user?.email?.includes("admin")`

## Database Monitoring

### Key Tables to Monitor:
1. **users** - User accounts and admin access
2. **products** - Product listings and seller activity
3. **orders** - Transaction history and revenue
4. **notifications** - Admin alerts and system events
5. **sessions** - Active user sessions

### Important Queries:

#### User Statistics
```sql
-- Total users
SELECT COUNT(*) as total_users FROM users;

-- Admin users
SELECT * FROM users WHERE username LIKE '%admin%' OR email LIKE '%admin%';

-- New users today
SELECT COUNT(*) as new_users_today FROM users WHERE created_at >= CURRENT_DATE;
```

#### Product Analytics
```sql
-- Total products
SELECT COUNT(*) as total_products FROM products;

-- Products by category
SELECT category, COUNT(*) as count FROM products GROUP BY category;

-- Top sellers
SELECT seller_id, COUNT(*) as products_count FROM products GROUP BY seller_id ORDER BY products_count DESC LIMIT 10;
```

#### Revenue Tracking
```sql
-- Total orders and revenue
SELECT COUNT(*) as total_orders, SUM(total) as total_revenue FROM orders;

-- Commission earned (20% of all sales)
SELECT SUM(total * 0.20) as commission_earned FROM orders WHERE status = 'completed';
```

## Database Access Methods

### 1. Direct SQL Tool (Current Method)
- Use the SQL execution tool in the development environment
- Good for quick queries and data inspection

### 2. Database Admin Dashboard (Recommended)
- Web-based interface for non-technical monitoring
- Real-time statistics and user management
- Safe query execution with error handling

### 3. Database Client Tools
- pgAdmin for PostgreSQL
- DBeaver (universal database tool)
- Command line with psql

## Security Best Practices

1. **Admin Password Policy**
   - Use strong passwords (minimum 12 characters)
   - Include uppercase, lowercase, numbers, and symbols
   - Change passwords regularly

2. **Database Access**
   - Limit direct database access to essential personnel
   - Use read-only accounts for monitoring
   - Log all database modifications

3. **Monitoring Alerts**
   - Set up notifications for unusual activity
   - Monitor failed login attempts
   - Track large data changes

## Environment Variables
```
DATABASE_URL=postgresql://connection_string
PGHOST=database_host
PGPORT=5432
PGUSER=database_user
PGPASSWORD=database_password
PGDATABASE=database_name
```

## Backup Recommendations
- Schedule daily automated backups
- Test restore procedures regularly
- Keep backups in separate geographical locations
- Maintain at least 30 days of backup history