-- ============================================================
-- Allow authenticated staff to read their own appointments
-- Staff are identified by: staff.user_id = auth.uid()
-- ============================================================

-- Appointments: staff can see appointments they are assigned to
create policy "appointments_staff_own" on public.appointments
  for select using (
    exists (
      select 1
      from public.appointment_items ai
      join public.staff s on s.id = ai.staff_id
      where ai.appointment_id = appointments.id
        and s.user_id = auth.uid()
        and s.deleted_at is null
    )
  );

-- Appointment items: staff can see their own items
create policy "appt_items_staff_own" on public.appointment_items
  for select using (
    exists (
      select 1 from public.staff s
      where s.id = appointment_items.staff_id
        and s.user_id = auth.uid()
        and s.deleted_at is null
    )
  );

-- Staff can update appointment status (confirm, check_in, complete, etc.)
create policy "appointments_staff_update" on public.appointments
  for update using (
    exists (
      select 1
      from public.appointment_items ai
      join public.staff s on s.id = ai.staff_id
      where ai.appointment_id = appointments.id
        and s.user_id = auth.uid()
        and s.deleted_at is null
    )
  );

-- Staff can read the customers on their appointments
create policy "customers_staff_via_appt" on public.customers
  for select using (
    exists (
      select 1
      from public.appointments a
      join public.appointment_items ai on ai.appointment_id = a.id
      join public.staff s on s.id = ai.staff_id
      where a.customer_id = customers.id
        and s.user_id = auth.uid()
        and s.deleted_at is null
    )
  );

-- Staff can read the services catalogue
create policy "services_authenticated_read" on public.services
  for select using (auth.uid() is not null);

-- Staff can read their own staff record
create policy "staff_read_own" on public.staff
  for select using (user_id = auth.uid());

-- Staff can read the outlet they belong to
create policy "outlets_staff_own" on public.outlets
  for select using (
    exists (
      select 1 from public.staff s
      where s.outlet_id = outlets.id
        and s.user_id = auth.uid()
        and s.deleted_at is null
    )
  );
