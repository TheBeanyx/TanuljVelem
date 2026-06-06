
-- Admin SELECT direct_messages
CREATE POLICY "Admin can view all messages" ON public.direct_messages FOR SELECT TO authenticated USING (public.is_admin_email());

-- Admin SELECT challenge_subscriptions / daily tasks
CREATE POLICY "Admin can view all subscriptions" ON public.challenge_subscriptions FOR SELECT TO authenticated USING (public.is_admin_email());
CREATE POLICY "Admin can delete any subscription" ON public.challenge_subscriptions FOR DELETE TO authenticated USING (public.is_admin_email());
CREATE POLICY "Admin can view all daily tasks" ON public.challenge_daily_tasks FOR SELECT TO authenticated USING (public.is_admin_email());

-- Admin DELETE ai_games
CREATE POLICY "Admin can delete any game" ON public.ai_games FOR DELETE TO authenticated USING (public.is_admin_email());

-- Admin DELETE announcements
CREATE POLICY "Admin can delete any announcement" ON public.announcements FOR DELETE TO authenticated USING (public.is_admin_email());

-- Admin UPDATE user_stats (adjust points)
CREATE POLICY "Admin can update any stats" ON public.user_stats FOR UPDATE TO authenticated USING (public.is_admin_email()) WITH CHECK (public.is_admin_email());
CREATE POLICY "Admin can insert any stats" ON public.user_stats FOR INSERT TO authenticated WITH CHECK (public.is_admin_email());

-- Admin badges: grant/revoke
CREATE POLICY "Admin can insert any badge" ON public.user_badges FOR INSERT TO authenticated WITH CHECK (public.is_admin_email());
CREATE POLICY "Admin can delete any badge" ON public.user_badges FOR DELETE TO authenticated USING (public.is_admin_email());

-- Admin can log point events for any user (audit trail)
CREATE POLICY "Admin can insert any point event" ON public.point_events FOR INSERT TO authenticated WITH CHECK (public.is_admin_email());
CREATE POLICY "Admin can view all point events" ON public.point_events FOR SELECT TO authenticated USING (public.is_admin_email());
