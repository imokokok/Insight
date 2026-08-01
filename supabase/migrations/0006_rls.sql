-- Row Level Security, policies, and grants

CREATE POLICY "Allow public read access to daily reports" ON "public"."daily_reports" FOR SELECT USING (true);



CREATE POLICY "Allow public read access to hourly snapshots" ON "public"."hourly_price_snapshots" FOR SELECT USING (true);



CREATE POLICY "Anyone can read oracle reputation" ON "public"."oracle_reputation" FOR SELECT USING (true);



CREATE POLICY "Anyone can read price records" ON "public"."price_records" FOR SELECT USING (true);



CREATE POLICY "Anyone can read reputation history" ON "public"."reputation_history" FOR SELECT USING (true);



CREATE POLICY "Public read protocol_asset_risk_params" ON "public"."protocol_asset_risk_params" FOR SELECT USING (true);



CREATE POLICY "Public read protocol_metrics" ON "public"."protocol_metrics" FOR SELECT USING (true);



CREATE POLICY "Public snapshots are viewable by all" ON "public"."user_snapshots" FOR SELECT USING (("is_public" = true));



CREATE POLICY "Service role manages protocol_asset_risk_params" ON "public"."protocol_asset_risk_params" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manages protocol_metrics" ON "public"."protocol_metrics" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manages rate limits" ON "public"."rate_limits" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role manages usage" ON "public"."api_key_usage" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can create own API keys" ON "public"."api_keys" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own alerts" ON "public"."price_alerts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own snapshots" ON "public"."user_snapshots" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own API keys" ON "public"."api_keys" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own alerts" ON "public"."price_alerts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own snapshots" ON "public"."user_snapshots" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."user_profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own API keys" ON "public"."api_keys" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own alert events" ON "public"."alert_events" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own alerts" ON "public"."price_alerts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own snapshots" ON "public"."user_snapshots" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own API keys" ON "public"."api_keys" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own alert events" ON "public"."alert_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own alerts" ON "public"."price_alerts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."user_profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own snapshots" ON "public"."user_snapshots" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."alert_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_key_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_keys" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cron_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."daily_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hourly_price_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."oracle_feeds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "oracle_feeds_read_all" ON "public"."oracle_feeds" FOR SELECT USING (true);



ALTER TABLE "public"."oracle_reputation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_alerts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."price_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."protocol_asset_risk_params" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."protocol_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reputation_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_snapshots" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."aggregate_oracle_reputation_v4"("p_provider" "text", "p_lookback_days" integer, "p_latency_baseline" integer, "p_provider_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."aggregate_oracle_reputation_v4"("p_provider" "text", "p_lookback_days" integer, "p_latency_baseline" integer, "p_provider_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."aggregate_oracle_reputation_v4"("p_provider" "text", "p_lookback_days" integer, "p_latency_baseline" integer, "p_provider_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_resolve_stale_alert_events"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_resolve_stale_alert_events"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_resolve_stale_alert_events"() TO "service_role";



GRANT ALL ON FUNCTION "public"."batch_update_feed_health"("p_results" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."batch_update_feed_health"("p_results" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."batch_update_feed_health"("p_results" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_api_key_usage"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_api_key_usage"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_api_key_usage"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_price_records"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_price_records"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_price_records"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_reputation_history"("p_retention_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_reputation_history"("p_retention_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_reputation_history"("p_retention_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_rate_limits"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_rate_limits"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_rate_limits"() TO "service_role";



GRANT ALL ON FUNCTION "public"."deactivate_expired_api_keys"() TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_expired_api_keys"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_expired_api_keys"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_feed_failures"("p_provider" "text", "p_symbol" "text", "p_chain_id" integer, "p_failure_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_feed_failures"("p_provider" "text", "p_symbol" "text", "p_chain_id" integer, "p_failure_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_feed_failures"("p_provider" "text", "p_symbol" "text", "p_chain_id" integer, "p_failure_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_rate_limit"("p_key" "text", "p_window_ms" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_rate_limit"("p_key" "text", "p_window_ms" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_rate_limit"("p_key" "text", "p_window_ms" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."recalculate_all_reputations"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_all_reputations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalculate_all_reputations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_reputation_fetch"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_reputation_fetch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_reputation_fetch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_oracle_feeds_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_oracle_feeds_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_oracle_feeds_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";












SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;



SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;
SET SESSION AUTHORIZATION "postgres";
RESET SESSION AUTHORIZATION;









GRANT ALL ON TABLE "public"."price_alerts" TO "anon";
GRANT ALL ON TABLE "public"."price_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."price_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."price_records" TO "anon";
GRANT ALL ON TABLE "public"."price_records" TO "authenticated";
GRANT ALL ON TABLE "public"."price_records" TO "service_role";



GRANT ALL ON TABLE "public"."active_alerts_with_prices" TO "anon";
GRANT ALL ON TABLE "public"."active_alerts_with_prices" TO "authenticated";
GRANT ALL ON TABLE "public"."active_alerts_with_prices" TO "service_role";



GRANT ALL ON TABLE "public"."alert_events" TO "anon";
GRANT ALL ON TABLE "public"."alert_events" TO "authenticated";
GRANT ALL ON TABLE "public"."alert_events" TO "service_role";



GRANT ALL ON TABLE "public"."api_key_usage" TO "anon";
GRANT ALL ON TABLE "public"."api_key_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."api_key_usage" TO "service_role";



GRANT ALL ON TABLE "public"."api_keys" TO "anon";
GRANT ALL ON TABLE "public"."api_keys" TO "authenticated";
GRANT ALL ON TABLE "public"."api_keys" TO "service_role";



GRANT ALL ON TABLE "public"."cron_config" TO "anon";
GRANT ALL ON TABLE "public"."cron_config" TO "authenticated";
GRANT ALL ON TABLE "public"."cron_config" TO "service_role";



GRANT ALL ON TABLE "public"."daily_reports" TO "anon";
GRANT ALL ON TABLE "public"."daily_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_reports" TO "service_role";



GRANT ALL ON SEQUENCE "public"."daily_reports_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."daily_reports_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."daily_reports_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."hourly_price_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."hourly_price_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."hourly_price_snapshots" TO "service_role";



GRANT ALL ON SEQUENCE "public"."hourly_price_snapshots_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."hourly_price_snapshots_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."hourly_price_snapshots_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."oracle_feeds" TO "anon";
GRANT ALL ON TABLE "public"."oracle_feeds" TO "authenticated";
GRANT ALL ON TABLE "public"."oracle_feeds" TO "service_role";



GRANT ALL ON TABLE "public"."oracle_reputation" TO "anon";
GRANT ALL ON TABLE "public"."oracle_reputation" TO "authenticated";
GRANT ALL ON TABLE "public"."oracle_reputation" TO "service_role";



GRANT ALL ON TABLE "public"."protocol_asset_risk_params" TO "anon";
GRANT ALL ON TABLE "public"."protocol_asset_risk_params" TO "authenticated";
GRANT ALL ON TABLE "public"."protocol_asset_risk_params" TO "service_role";



GRANT ALL ON TABLE "public"."protocol_metrics" TO "anon";
GRANT ALL ON TABLE "public"."protocol_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."protocol_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."reputation_history" TO "anon";
GRANT ALL ON TABLE "public"."reputation_history" TO "authenticated";
GRANT ALL ON TABLE "public"."reputation_history" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."user_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."user_snapshots" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
