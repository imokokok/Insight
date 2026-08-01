-- Indexes

CREATE INDEX "idx_alert_events_acknowledged" ON "public"."alert_events" USING "btree" ("acknowledged") WHERE ("acknowledged" = false);



CREATE INDEX "idx_alert_events_alert_id" ON "public"."alert_events" USING "btree" ("alert_id");



CREATE INDEX "idx_alert_events_triggered_at" ON "public"."alert_events" USING "btree" ("triggered_at" DESC);



CREATE INDEX "idx_alert_events_user_id" ON "public"."alert_events" USING "btree" ("user_id");



CREATE INDEX "idx_api_key_usage_key_created" ON "public"."api_key_usage" USING "btree" ("api_key_id", "created_at");



CREATE INDEX "idx_api_key_usage_key_time" ON "public"."api_key_usage" USING "btree" ("api_key_id", "created_at" DESC);



CREATE INDEX "idx_api_keys_active" ON "public"."api_keys" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_api_keys_expires_at" ON "public"."api_keys" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_api_keys_key_hash" ON "public"."api_keys" USING "btree" ("key_hash") WHERE ("is_active" = true);



CREATE INDEX "idx_api_keys_user_id" ON "public"."api_keys" USING "btree" ("user_id");



CREATE INDEX "idx_daily_reports_coverage_matrix" ON "public"."daily_reports" USING "gin" ("coverage_matrix");



CREATE INDEX "idx_daily_reports_date" ON "public"."daily_reports" USING "btree" ("report_date" DESC);



CREATE INDEX "idx_daily_reports_failure_breakdown" ON "public"."daily_reports" USING "gin" ("failure_breakdown");



CREATE INDEX "idx_daily_reports_protocol_liquidation_risks" ON "public"."daily_reports" USING "gin" ("protocol_liquidation_risks");



CREATE INDEX "idx_daily_reports_stablecoin_depeg" ON "public"."daily_reports" USING "gin" ("stablecoin_depeg");



CREATE INDEX "idx_daily_reports_wrapped_asset_peg" ON "public"."daily_reports" USING "gin" ("wrapped_asset_peg");



CREATE INDEX "idx_hourly_snapshots_hour" ON "public"."hourly_price_snapshots" USING "btree" ("snapshot_hour" DESC);



CREATE INDEX "idx_hourly_snapshots_provider_symbol_hour" ON "public"."hourly_price_snapshots" USING "btree" ("provider", "symbol", "snapshot_hour" DESC);



CREATE INDEX "idx_oracle_feeds_provider" ON "public"."oracle_feeds" USING "btree" ("provider");



CREATE INDEX "idx_oracle_feeds_provider_active" ON "public"."oracle_feeds" USING "btree" ("provider", "is_active");



CREATE INDEX "idx_oracle_feeds_provider_chain" ON "public"."oracle_feeds" USING "btree" ("provider", "chain_id", "is_active");



CREATE INDEX "idx_oracle_feeds_stale" ON "public"."oracle_feeds" USING "btree" ("provider", "is_active", "consecutive_failures") WHERE (("is_active" = true) AND ("consecutive_failures" >= 3));



CREATE INDEX "idx_oracle_feeds_symbol_chain" ON "public"."oracle_feeds" USING "btree" ("symbol", "chain_id");



CREATE INDEX "idx_oracle_reputation_provider" ON "public"."oracle_reputation" USING "btree" ("provider");



CREATE INDEX "idx_oracle_reputation_score" ON "public"."oracle_reputation" USING "btree" ("overall_score" DESC);



CREATE INDEX "idx_price_alerts_active" ON "public"."price_alerts" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_price_alerts_name" ON "public"."price_alerts" USING "btree" ("name");



CREATE INDEX "idx_price_alerts_provider" ON "public"."price_alerts" USING "btree" ("provider");



CREATE INDEX "idx_price_alerts_symbol" ON "public"."price_alerts" USING "btree" ("symbol");



CREATE INDEX "idx_price_alerts_user_id" ON "public"."price_alerts" USING "btree" ("user_id");



CREATE INDEX "idx_price_records_chain" ON "public"."price_records" USING "btree" ("chain");



CREATE INDEX "idx_price_records_failure_mode" ON "public"."price_records" USING "btree" ("failure_mode");



CREATE INDEX "idx_price_records_ingestion_timestamp" ON "public"."price_records" USING "btree" ("ingestion_timestamp" DESC);



CREATE INDEX "idx_price_records_metadata" ON "public"."price_records" USING "gin" ("metadata");



CREATE INDEX "idx_price_records_provider_symbol" ON "public"."price_records" USING "btree" ("provider", "symbol");



CREATE INDEX "idx_price_records_provider_symbol_timestamp" ON "public"."price_records" USING "btree" ("provider", "symbol", "timestamp" DESC);



CREATE INDEX "idx_price_records_signal_vector" ON "public"."price_records" USING "gin" ("signal_vector");



CREATE INDEX "idx_price_records_timestamp" ON "public"."price_records" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_price_records_ttl" ON "public"."price_records" USING "btree" ("ttl");



CREATE INDEX "idx_protocol_asset_risk_params_fetched_at" ON "public"."protocol_asset_risk_params" USING "btree" ("fetched_at" DESC);



CREATE INDEX "idx_protocol_asset_risk_params_lookup" ON "public"."protocol_asset_risk_params" USING "btree" ("protocol_id", "asset_symbol");



CREATE INDEX "idx_protocol_metrics_fetched_at" ON "public"."protocol_metrics" USING "btree" ("fetched_at" DESC);



CREATE INDEX "idx_protocol_metrics_protocol_id" ON "public"."protocol_metrics" USING "btree" ("protocol_id");



CREATE INDEX "idx_rate_limits_created_at" ON "public"."rate_limits" USING "btree" ("created_at");



CREATE INDEX "idx_rate_limits_key_created" ON "public"."rate_limits" USING "btree" ("key", "created_at" DESC);



CREATE INDEX "idx_reputation_history_failure_mode" ON "public"."reputation_history" USING "btree" ("failure_mode");



CREATE INDEX "idx_reputation_history_provider_failure_mode" ON "public"."reputation_history" USING "btree" ("provider", "failure_mode");



CREATE INDEX "idx_reputation_history_provider_time" ON "public"."reputation_history" USING "btree" ("provider", "snapshot_time" DESC);



CREATE INDEX "idx_reputation_history_snapshot_time" ON "public"."reputation_history" USING "btree" ("snapshot_time" DESC);



CREATE INDEX "idx_reputation_history_symbol" ON "public"."reputation_history" USING "btree" ("symbol");



CREATE INDEX "idx_user_snapshots_created_at" ON "public"."user_snapshots" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_snapshots_public" ON "public"."user_snapshots" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_user_snapshots_symbol" ON "public"."user_snapshots" USING "btree" ("symbol");



CREATE INDEX "idx_user_snapshots_user_id" ON "public"."user_snapshots" USING "btree" ("user_id");
