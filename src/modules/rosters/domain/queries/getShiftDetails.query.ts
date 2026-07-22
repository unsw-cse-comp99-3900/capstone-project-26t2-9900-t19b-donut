/**
 * Get Shift Details Query
 * Domain layer - fetches full shift details with joins
 */

import { supabase } from '@/platform/supabase/client';

export interface ShiftDetails {
    id: string;
    shiftDate: string;
    startTime: string;
    endTime: string;
    departmentId: string;
    departmentName?: string;
    subDepartmentId: string;
    subDepartmentName?: string;
    roleId?: string;
    roleName?: string;
    assignedEmployeeId?: string;
    assignedEmployeeName?: string;
    remunerationLevelId?: string;
    remunerationLevel?: number;
    status: string;
    isDraft: boolean;
    shiftGroupId?: string;
    shiftGroupName?: string;
    shiftSubgroupId?: string;
    shiftSubgroupName?: string;
    length?: number;
    netLength?: number;
    paidBreakDuration?: number;
    unpaidBreakDuration?: number;
    createdAt: string;
    updatedAt?: string;
}

// Internal interfaces for Supabase Query Result
interface Department { name: string; }
interface SubDepartment { name: string; }
interface Role { name: string; }
interface Employee { first_name: string; last_name: string; }
interface RemunerationLevel { level_number: number; }
interface RosterGroup { name: string; }
interface RosterSubgroup {
    name: string;
    roster_group: RosterGroup | null;
}

interface ShiftQueryResult {
    id: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    department_id: string;
    sub_department_id: string;
    role_id: string | null;
    assigned_employee_id: string | null;
    remuneration_level_id: string | null;
    lifecycle_status: string;
    is_draft: boolean;
    shift_group_id: string | null;
    roster_subgroup_id: string;
    scheduled_length_minutes: number | null;
    net_length_minutes: number | null;
    paid_break_minutes: number | null;
    unpaid_break_minutes: number | null;
    created_at: string | null;
    updated_at: string | null;
    // Joined tables
    departments: Department | null;
    sub_departments: SubDepartment | null;
    roles: Role | null;
    assigned_profiles: Employee | null;
    remuneration_levels: RemunerationLevel | null;
    roster_subgroup: RosterSubgroup | null;
}

/**
 * Fetch detailed shift information with related data
 */
export async function getShiftDetails(
    shiftId: string
): Promise<ShiftDetails | null> {
    if (!shiftId) return null;

    const { data: rawData, error } = await supabase
        .from('shifts')
        .select(`
      id,
      shift_date,
      start_time,
      end_time,
      department_id,
      sub_department_id,
      role_id,
      assigned_employee_id,
      remuneration_level_id,
      lifecycle_status,
      is_draft,
      shift_group_id,
      roster_subgroup_id,
      scheduled_length_minutes,
      net_length_minutes,
      paid_break_minutes,
      unpaid_break_minutes,
      created_at,
      updated_at,
      departments(name),
      sub_departments(name),
      roles(name),
      assigned_profiles:profiles!assigned_employee_id(first_name, last_name),
      remuneration_levels(level_number),
      roster_subgroup:roster_subgroups(name, roster_group:roster_groups(name))
    `)
        .eq('id', shiftId)
        .single();

    if (error || !rawData) {
        console.error('[getShiftDetails] Error:', error);
        return null;
    }

    // Cast the raw Supabase response to our typed interface
    // In a perfect world, we'd use the generated Database types, but this is a solid middle ground
    const data = rawData as unknown as ShiftQueryResult;

    return {
        id: data.id,
        shiftDate: data.shift_date,
        startTime: data.start_time,
        endTime: data.end_time,
        departmentId: data.department_id,
        departmentName: data.departments?.name,
        subDepartmentId: data.sub_department_id,
        subDepartmentName: data.sub_departments?.name,
        roleId: data.role_id || undefined,
        roleName: data.roles?.name,
        assignedEmployeeId: data.assigned_employee_id || undefined,
        assignedEmployeeName: data.assigned_profiles
            ? `${data.assigned_profiles.first_name} ${data.assigned_profiles.last_name}`
            : undefined,
        remunerationLevelId: data.remuneration_level_id || undefined,
        remunerationLevel: data.remuneration_levels?.level_number,
        status: data.lifecycle_status || 'Draft',
        isDraft: data.is_draft ?? true,
        shiftGroupId: data.shift_group_id || undefined,
        shiftGroupName: data.roster_subgroup?.roster_group?.name,
        shiftSubgroupId: data.roster_subgroup_id || undefined,
        shiftSubgroupName: data.roster_subgroup?.name,
        length: data.scheduled_length_minutes ?? undefined,
        netLength: data.net_length_minutes ?? undefined,
        paidBreakDuration: data.paid_break_minutes ?? undefined,
        unpaidBreakDuration: data.unpaid_break_minutes ?? undefined,
        createdAt: data.created_at || '',
        updatedAt: data.updated_at || undefined,
    };
}
