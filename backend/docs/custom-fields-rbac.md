# Custom Fields RBAC Implementation

## Overview

This document outlines the Role-Based Access Control (RBAC) system implemented for custom fields in the project management system. The RBAC system provides granular permissions for managing custom field definitions and values.

## Permission Structure

### Custom Field Permissions

| Permission | Description | Admin | Member | Guest |
|------------|-------------|-------|--------|-------|
| `VIEW_CUSTOM_FIELDS` | View custom field definitions and values | ✅ | ✅ | ✅ |
| `MANAGE_CUSTOM_FIELDS` | Full management of custom field system | ✅ | ❌ | ❌ |
| `CREATE_CUSTOM_FIELDS` | Create new custom field definitions | ✅ | ❌ | ❌ |
| `UPDATE_CUSTOM_FIELDS` | Update existing custom field definitions | ✅ | ❌ | ❌ |
| `DELETE_CUSTOM_FIELDS` | Delete custom field definitions | ✅ | ❌ | ❌ |
| `VIEW_SENSITIVE_FIELDS` | View sensitive custom field values | ✅ | ❌ | ❌ |
| `UPDATE_SENSITIVE_FIELDS` | Update sensitive custom field values | ✅ | ❌ | ❌ |

### Role-Based Access

#### Admin Role
- **Full Access**: Complete control over custom field definitions and values
- **Can**: Create, update, delete field definitions
- **Can**: View and update sensitive fields
- **Can**: Manage field-level security settings

#### Member Role  
- **Limited Access**: Can view and use custom fields but cannot manage definitions
- **Can**: View custom field definitions and values
- **Can**: Update non-sensitive custom field values (with UPDATE_PROJECTS permission)
- **Cannot**: Create, update, or delete field definitions
- **Cannot**: View or update sensitive fields

#### Guest Role
- **Read-Only Access**: Can only view custom fields
- **Can**: View custom field definitions and values
- **Cannot**: Update any custom field values
- **Cannot**: View sensitive fields

## Field-Level Security

### Security Configuration

Each custom field definition can include security settings:

```typescript
interface CustomFieldSecurity {
  sensitive?: boolean;           // Requires VIEW_SENSITIVE_FIELDS to view
  adminOnly?: boolean;          // Requires MANAGE_CUSTOM_FIELDS to edit
  readOnly?: boolean;           // Cannot be edited by users
  visibleToRoles?: string[];    // Only visible to specific roles
  editableByRoles?: string[];   // Only editable by specific roles
}
```

### Security Examples

#### Sensitive Financial Field
```typescript
{
  id: 'budget-field',
  name: 'Project Budget',
  type: CustomFieldType.CURRENCY,
  security: {
    sensitive: true,           // Only admins can view
    adminOnly: true,          // Only admins can edit
  }
}
```

#### Department Field (Role-Based)
```typescript
{
  id: 'department-field', 
  name: 'Department',
  type: CustomFieldType.SINGLE_SELECT,
  security: {
    visibleToRoles: ['admin', 'member'], // Hidden from guests
    editableByRoles: ['admin'],          // Only admins can change
  }
}
```

#### Read-Only System Field
```typescript
{
  id: 'created-by-system',
  name: 'System Generated ID',
  type: CustomFieldType.TEXT_SHORT,
  security: {
    readOnly: true,           // Cannot be edited by anyone
  }
}
```

## API Endpoint Security

### Custom Field Definition Management

```typescript
// GET /workspaces/:id/projects/custom-fields/definitions
@CanViewCustomFields()        // Admin, Member, Guest

// POST /workspaces/:id/projects/custom-fields/definitions  
@CanCreateCustomFields()      // Admin only

// PATCH /workspaces/:id/projects/custom-fields/definitions/:fieldId
@CanUpdateCustomFields()      // Admin only

// DELETE /workspaces/:id/projects/custom-fields/definitions/:fieldId
@CanDeleteCustomFields()      // Admin only
```

### Custom Field Value Management

```typescript
// GET /workspaces/:id/projects/:projectId/custom-fields
@CanViewCustomFields()        // Admin, Member, Guest

// PATCH /workspaces/:id/projects/:projectId/custom-fields
@CanUpdateCustomFields()      // Admin, Member (non-sensitive only)
```

## Permission Validation Logic

### Field Definition Access
1. Check workspace membership and role
2. Verify required permission (CREATE/UPDATE/DELETE_CUSTOM_FIELDS)
3. For sensitive fields, verify VIEW_SENSITIVE_FIELDS permission

### Field Value Access  
1. Check workspace membership and role
2. Verify project access permissions
3. For each field:
   - Check if field is sensitive → require VIEW_SENSITIVE_FIELDS
   - Check field visibility rules → verify user role is allowed
   - For updates, check edit permissions and adminOnly flag

### Implementation Example

```typescript
async validateFieldAccess(
  userId: string,
  workspaceId: string, 
  field: CustomFieldDefinition,
  operation: 'view' | 'edit'
): Promise<boolean> {
  const membership = await this.getMembership(userId, workspaceId);
  
  // Check basic permission
  if (operation === 'view' && !hasPermission(membership, 'VIEW_CUSTOM_FIELDS')) {
    return false;
  }
  
  // Check sensitive field access
  if (field.security?.sensitive && !hasPermission(membership, 'VIEW_SENSITIVE_FIELDS')) {
    return false;
  }
  
  // Check role-based visibility
  if (field.security?.visibleToRoles && 
      !field.security.visibleToRoles.includes(membership.role)) {
    return false;
  }
  
  // Check edit permissions
  if (operation === 'edit') {
    if (field.security?.readOnly) return false;
    if (field.security?.adminOnly && membership.role !== 'admin') return false;
    if (field.security?.editableByRoles && 
        !field.security.editableByRoles.includes(membership.role)) {
      return false;
    }
  }
  
  return true;
}
```

## Security Best Practices

### 1. Principle of Least Privilege
- Grant minimum permissions required for user role
- Default to restrictive access for sensitive fields
- Regularly audit permission assignments

### 2. Field Classification
- Mark financial/personal data as sensitive
- Use adminOnly for critical business fields  
- Implement readOnly for system-generated values

### 3. Audit Logging
- Log all custom field definition changes
- Track sensitive field access and updates
- Monitor permission escalation attempts

### 4. Data Protection
- Encrypt sensitive field values at rest
- Mask sensitive data in audit logs
- Implement field-level data retention policies

## Migration Considerations

### Existing Implementations
If upgrading from basic custom fields:

1. **Audit Existing Fields**: Review all custom fields for sensitivity
2. **Classify Fields**: Apply appropriate security settings
3. **Update Permissions**: Migrate from project permissions to custom field permissions
4. **Test Access**: Verify role-based access works correctly
5. **Update Documentation**: Train users on new permission model

### Backward Compatibility
- Legacy custom fields default to non-sensitive
- Existing project permissions still work for basic operations
- Gradual migration path available

## Monitoring and Compliance

### Access Monitoring
- Track who accesses sensitive fields
- Monitor failed permission checks
- Alert on unusual access patterns

### Compliance Features
- Support for GDPR/privacy requirements
- Field-level access controls for compliance
- Audit trail for regulatory reporting

## Future Enhancements

### Planned Features
1. **Dynamic Permissions**: Context-based field access
2. **Field Encryption**: Automatic encryption for sensitive fields
3. **Approval Workflows**: Required approvals for sensitive field changes
4. **Field History**: Track all changes to sensitive fields
5. **Data Masking**: Automatic masking of sensitive data in exports 