-- ============================================
-- Migration: Fix schema inconsistencies
-- Version: 003
-- Description: Fix ttl field type and add missing columns
-- ============================================

-- ============================================
-- 修复 1: 处理 price_records 表的 ttl 字段
-- 问题：ttl 字段可能包含字符串值，需要清理
-- ============================================

-- 先检查当前 ttl 字段的数据情况
-- SELECT ttl, COUNT(*) FROM public.price_records GROUP BY ttl;

-- 删除无效的 ttl 记录（或者你可以先备份）
-- 注意：这会导致一些测试数据丢失，生产环境请谨慎
DELETE FROM public.price_records 
WHERE ttl IS NULL 
   OR ttl::text = '' 
   OR ttl::text = '1h'
   OR ttl::text = '1d'
   OR ttl::text = '30m'
   OR ttl::text ~ '^[0-9]+[smhd]$';

-- 如果表为空或者 ttl 都是有效的时间戳，则添加默认值
UPDATE public.price_records 
SET ttl = NOW() + INTERVAL '1 hour'
WHERE ttl IS NULL OR ttl::text = '';

-- ============================================
-- 修复 2: 为 alert_events 表添加 created_at 字段
-- ============================================
ALTER TABLE public.alert_events 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 修复 3: 为 user_favorites 表添加 updated_at 字段
-- ============================================
ALTER TABLE public.user_favorites 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 添加触发器自动更新 updated_at（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_user_favorites_updated_at'
        AND tgrelid = 'public.user_favorites'::regclass
    ) THEN
        CREATE TRIGGER update_user_favorites_updated_at
            BEFORE UPDATE ON public.user_favorites
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$$;

-- ============================================
-- 修复 4: 为 price_records 添加 ttl 自动计算触发器
-- ============================================

-- 创建函数来自动计算 ttl（如果还不存在）
CREATE OR REPLACE FUNCTION public.calculate_ttl()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果 ttl 是空或者无效，设置为 1 小时后
    IF NEW.ttl IS NULL OR NEW.ttl::text = '' THEN
        NEW.ttl = NOW() + INTERVAL '1 hour';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 添加触发器（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'set_price_records_ttl'
        AND tgrelid = 'public.price_records'::regclass
    ) THEN
        CREATE TRIGGER set_price_records_ttl
            BEFORE INSERT OR UPDATE ON public.price_records
            FOR EACH ROW
            EXECUTE FUNCTION public.calculate_ttl();
    END IF;
END
$$;

-- ============================================
-- 修复 5: 添加注释
-- ============================================
COMMENT ON COLUMN public.price_records.ttl IS 'Record expiration timestamp';
COMMENT ON COLUMN public.alert_events.created_at IS 'When the alert event was created';
COMMENT ON COLUMN public.user_favorites.updated_at IS 'When the favorite was last updated';

-- ============================================
-- 验证修复结果
-- ============================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('price_records', 'alert_events', 'user_favorites')
ORDER BY table_name, ordinal_position;
