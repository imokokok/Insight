import { createRequire as __createRequire } from 'node:module'; import { fileURLToPath as __fileURLToPath } from 'node:url'; import { dirname as __pathDirname } from 'node:path'; const require = __createRequire(import.meta.url); const __filename = __fileURLToPath(import.meta.url); const __dirname = __pathDirname(__filename);
function readTursoPriceProjectionMode(value=process.env.TURSO_PRICE_PROJECTION_MODE){if(value===void 0||value===""||value==="supabase")return"supabase";if(value==="turso")return value;throw new Error("TURSO_PRICE_PROJECTION_MODE must be supabase or turso")}function toInt(flag){return flag?1:0}var HOURLY_UPSERT_CHUNK=200,HOURLY_UPSERT_SQL=`
  INSERT INTO hourly_price_snapshots (
    provider, symbol, chain_id, price,
    consensus_price, deviation_pct, latency_ms, data_age_seconds,
    confidence, is_success, error_message, snapshot_hour, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT (provider, symbol, chain_id, snapshot_hour) DO UPDATE SET
    price = excluded.price,
    consensus_price = excluded.consensus_price,
    deviation_pct = excluded.deviation_pct,
    latency_ms = excluded.latency_ms,
    data_age_seconds = excluded.data_age_seconds,
    confidence = excluded.confidence,
    is_success = excluded.is_success,
    error_message = excluded.error_message
`;function bindHourlyRow(row,createdAt){return[row.provider,row.symbol,row.chain_id,row.price,row.consensus_price,row.deviation_pct,row.latency_ms,row.data_age_seconds,row.confidence,toInt(row.is_success),row.error_message,row.snapshot_hour,createdAt]}function chunkHourlyRows(rows){let chunks=[];for(let index=0;index<rows.length;index+=HOURLY_UPSERT_CHUNK)chunks.push(rows.slice(index,index+HOURLY_UPSERT_CHUNK));return chunks}async function writeProjectedTursoPriceSlot(client,input){let snapshotMs=input.snapshotTs.getTime();if(!Number.isSafeInteger(snapshotMs)||snapshotMs<0)throw new Error("Cannot project a Turso price slot with an invalid timestamp");let projectedAt=new Date().toISOString(),replayed=(await client.execute({sql:"SELECT 1 FROM price_slot_projection_runs WHERE slot_ms = ? AND input_hash = ?",args:[snapshotMs,input.inputHash]})).rows.length>0,statements=chunkHourlyRows(input.hourlyRows).flatMap(chunk=>chunk.map(row=>({sql:HOURLY_UPSERT_SQL,args:bindHourlyRow(row,projectedAt)})));return statements.push({sql:`
      INSERT INTO price_slot_projection_runs (
        slot_ms, input_hash, raw_digest, partition_key, hourly_written, projected_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (slot_ms, input_hash) DO UPDATE SET
        raw_digest = excluded.raw_digest,
        partition_key = excluded.partition_key,
        hourly_written = excluded.hourly_written,
        projected_at = excluded.projected_at
    `,args:[snapshotMs,input.inputHash,input.rawDigest,input.partitionKey,input.hourlyRows.length,projectedAt]}),await client.batch(statements,"write"),{hourlyWritten:input.hourlyRows.length,replayed}}function medianInterpolated(values){let sorted=[...values].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);return sorted.length%2===1?sorted[mid]:(sorted[mid-1]+sorted[mid])/2}async function readTursoOracleHistoryBaseline(client,symbol,sinceMs,beforeMs){if(!Number.isFinite(sinceMs)||!Number.isFinite(beforeMs)||beforeMs<=sinceMs)throw new Error("Invalid oracle history baseline window");let lower=new Date(sinceMs-36e5).toISOString(),upper=new Date(beforeMs).toISOString(),result=await client.execute({sql:`SELECT snapshot_hour, price, deviation_pct
          FROM hourly_price_snapshots
          WHERE symbol = upper(trim(?)) AND is_success = 1
            AND snapshot_hour >= ? AND snapshot_hour < ?`,args:[symbol,lower,upper]}),groups=new Map;for(let row of result.rows){let tsMs=Date.parse(String(row.snapshot_hour));if(!Number.isFinite(tsMs)||tsMs<sinceMs||tsMs>=beforeMs||tsMs%36e5!==0)continue;let price=Number(row.price);if(!Number.isFinite(price)||price<=0)continue;let deviation=row.deviation_pct===null||row.deviation_pct===void 0?0:Math.abs(Number(row.deviation_pct)),group=groups.get(tsMs)??{deviations:[],prices:[]};group.deviations.push(Number.isFinite(deviation)?deviation:0),group.prices.push(price),groups.set(tsMs,group)}return[...groups.entries()].sort((a,b)=>a[0]-b[0]).map(([tsMs,group])=>({hour:new Date(tsMs).toISOString(),max_deviation_pct:Math.max(...group.deviations,0),consensus_price:medianInterpolated(group.prices),participant_count:group.prices.length}))}async function upsertTursoHourlySnapshots(client,rows){if(rows.length===0)return 0;if(rows.length>500)throw new Error("Expected an hourly snapshot batch of at most 500 rows");let dedup=new Map;for(let row of rows){let normalized={...row,snapshot_hour:new Date(row.snapshot_hour).toISOString()},key=`${normalized.snapshot_hour}|${normalized.provider}|${normalized.symbol}|${normalized.chain_id}`,existing=dedup.get(key);existing&&normalized.is_success!==existing.is_success?normalized.is_success&&dedup.set(key,normalized):dedup.set(key,normalized)}let nowIso=new Date().toISOString(),sql=`INSERT INTO hourly_price_snapshots (
                 snapshot_hour, provider, symbol, chain_id, price,
                 consensus_price, deviation_pct, latency_ms, data_age_seconds,
                 confidence, is_success, error_message, created_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT (provider, symbol, chain_id, snapshot_hour) DO UPDATE
                 SET price = excluded.price,
                     consensus_price = excluded.consensus_price,
                     deviation_pct = excluded.deviation_pct,
                     latency_ms = excluded.latency_ms,
                     data_age_seconds = excluded.data_age_seconds,
                     confidence = excluded.confidence,
                     is_success = excluded.is_success,
                     error_message = excluded.error_message
                 WHERE NOT hourly_price_snapshots.is_success
                   AND excluded.is_success`,batch=[...dedup.values()].map(row=>({sql,args:[row.snapshot_hour,row.provider,row.symbol,row.chain_id,row.price,row.consensus_price,row.deviation_pct,row.latency_ms,row.data_age_seconds,row.confidence,row.is_success?1:0,row.error_message,nowIso]}));return(await client.batch(batch,"write")).reduce((sum,r)=>sum+Number(r.rowsAffected??0),0)}export{readTursoPriceProjectionMode,writeProjectedTursoPriceSlot,readTursoOracleHistoryBaseline,upsertTursoHourlySnapshots};
