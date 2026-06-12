import { getSupabaseServer } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/employees
// Query params:
//   - outlet_id (required): Filter by outlet
//   - status (optional): Filter by employee status (active/inactive/resigned/suspended)
//   - role (optional): Filter by role
//   - limit (optional): Limit number of results (default: 100)
// Example: /api/employees?outlet_id=xxx&status=active

export async function GET(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const outlet_id = searchParams.get('outlet_id');
    const status = searchParams.get('status');
    const role = searchParams.get('role');
    const limit = searchParams.get('limit') || '100';

    // Validate required parameters
    if (!outlet_id) {
      return NextResponse.json(
        { error: 'outlet_id is required' },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from('employees')
      .select('id, name, phone, email, role, department, status, base_salary, salary_type, hire_date, last_salary_paid_date, created_at')
      .eq('outlet_id', outlet_id)
      .order('name', { ascending: true })
      .limit(parseInt(limit));

    // Apply optional filters
    if (status) {
      query = query.eq('status', status);
    }

    if (role) {
      query = query.eq('role', role);
    }

    // Execute query
    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch employees', details: error.message },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const employees = (data || []).map(emp => ({
      id: emp.id,
      name: emp.name,
      phone: emp.phone || '',
      email: emp.email || '',
      role: emp.role,
      department: emp.department || '',
      status: emp.status,
      base_salary: emp.base_salary || 0,
      salary_type: emp.salary_type,
      hire_date: emp.hire_date,
      last_salary_paid_date: emp.last_salary_paid_date,
      created_at: emp.created_at
    }));

    return NextResponse.json(
      {
        success: true,
        employees,
        count: employees.length,
        outlet_id
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/employees
// Create new employee
// Body:
//   {
//     outlet_id: string (UUID),
//     name: string (required),
//     phone: string,
//     email: string,
//     role: string (required),
//     department: string,
//     base_salary: number,
//     salary_type: 'bulanan' | 'harian' | 'jam',
//     hire_date: string (YYYY-MM-DD),
//     notes: string
//   }

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const body = await request.json();

    // Validate required fields
    const { outlet_id, name, role } = body;
    if (!outlet_id || !name || !role) {
      return NextResponse.json(
        { error: 'outlet_id, name, and role are required' },
        { status: 400 }
      );
    }

    // Validate role values
    const validRoles = ['Kepala Toko', 'Kasir', 'Koki', 'Helper', 'Admin', 'Packaging'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      );
    }

    // Create employee
    const { data, error } = await supabase
      .from('employees')
      .insert({
        outlet_id,
        name,
        phone: body.phone || null,
        email: body.email || null,
        role,
        department: body.department || null,
        status: body.status || 'active',
        base_salary: body.base_salary || null,
        salary_type: body.salary_type || 'bulanan',
        hire_date: body.hire_date || null,
        notes: body.notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to create employee', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        employee: data,
        message: 'Employee created successfully'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
