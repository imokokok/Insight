-- Triggers

CREATE OR REPLACE TRIGGER "trg_update_oracle_feeds_updated_at" BEFORE UPDATE ON "public"."oracle_feeds" FOR EACH ROW EXECUTE FUNCTION "public"."update_oracle_feeds_updated_at"();



CREATE OR REPLACE TRIGGER "update_api_keys_updated_at" BEFORE UPDATE ON "public"."api_keys" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_oracle_reputation_updated_at" BEFORE UPDATE ON "public"."oracle_reputation" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_price_alerts_updated_at" BEFORE UPDATE ON "public"."price_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_protocol_asset_risk_params_updated_at" BEFORE UPDATE ON "public"."protocol_asset_risk_params" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_protocol_metrics_updated_at" BEFORE UPDATE ON "public"."protocol_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_profiles_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_snapshots_updated_at" BEFORE UPDATE ON "public"."user_snapshots" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

-- Trigger: auto-create user_profile on signup
CREATE OR REPLACE TRIGGER "on_auth_user_created"
    AFTER INSERT ON "auth"."users"
    FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_user"();
