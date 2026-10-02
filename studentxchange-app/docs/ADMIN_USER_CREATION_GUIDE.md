# How to Create Admin Users - StudentXchange

## Method 1: Using the Database Monitor (Recommended)

1. **Login as Admin**
   - Username: `admin`
   - Password: `password123`

2. **Access Database Monitor**
   - Navigate to `/database-monitor` 
   - Click on "Database" in the header navigation
   - Go to the "Users" tab

3. **Create New Admin User**
   - Fill in the form fields:
     - Username: `admin_john` (or any username)
     - Email: `admin_john@studentxchange.in`
     - Phone: `7039862086` (or any phone number)
     - Password: Create a secure password
   - Check "Create as Admin User" checkbox
   - Click "Create Admin User"

## Method 2: Direct Database SQL

1. **Access Database Monitor**
   - Go to SQL Query tab
   - Run this query:

```sql
INSERT INTO users (username, password, email, phone) 
VALUES ('admin_newuser', 'securepassword123', 'admin_newuser@studentxchange.in', '7039862086');
```

## Method 3: Update Existing User

1. **Find User ID**
```sql
SELECT id, username, email FROM users WHERE username = 'existing_user';
```

2. **Update to Admin**
```sql
UPDATE users SET username = 'admin_existing', email = 'admin_existing@studentxchange.in' WHERE id = [user_id];
```

## Admin Access Rules

- Users with "admin" in their **username** OR **email** automatically get admin privileges
- Admin users can access:
  - `/admin` - Admin Dashboard
  - `/database-monitor` - Database Monitor
  - All admin-only features

## Example Admin Usernames/Emails
- `admin`, `admin_john`, `admin_manager`
- `admin@studentxchange.in`, `admin_john@studentxchange.in`
- `user@admin.com`, `manager@admin.studentxchange.in`

## Security Best Practices

1. **Strong Passwords**: Use at least 12 characters with mixed case, numbers, and symbols
2. **Unique Usernames**: Don't reuse admin usernames
3. **Regular Updates**: Change passwords regularly
4. **Monitor Activity**: Check admin actions in notifications
5. **Limit Access**: Only create admin users when necessary

## Testing Admin Access

1. **Login** with the new admin credentials
2. **Check Header** - Should see "Admin" and "Database" links
3. **Access Dashboard** - Should be able to view admin features
4. **Database Monitor** - Should be able to access database tools

## Database Monitoring Features

### For Admin Users:
- View all users, products, and orders
- Execute SQL queries (SELECT, INSERT, UPDATE only)
- Create new users and admins
- Monitor system activity
- View database statistics

### Security Features:
- SQL injection protection
- Limited query operations
- Admin-only access control
- Activity logging
- Error handling

## Troubleshooting

### Can't Access Admin Features?
1. Check if username/email contains "admin"
2. Try logging out and back in
3. Verify user was created correctly in database

### Database Monitor Not Working?
1. Ensure you're logged in as admin
2. Check browser console for errors
3. Verify database connection is working

### SQL Queries Failing?
1. Only SELECT, INSERT, UPDATE allowed
2. Check query syntax
3. Verify table names and column names

## Need Help?

Contact the system administrator or check the database directly using the SQL Query tab in the Database Monitor.