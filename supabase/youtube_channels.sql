-- youtube_channels: 유튜브 채널 협업 후보 관리 (어드민 전용)
-- Supabase SQL Editor에서 실행
--
-- RLS 정책의 어드민 이메일은 nudgefilm@gmail.com(ADMIN_EMAIL)으로 설정되어 있습니다.

CREATE TABLE public.youtube_channels (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id        text        NOT NULL UNIQUE,
  channel_name      text        NOT NULL,
  channel_url       text        NOT NULL,
  description       text,
  subscriber_count  integer,
  video_count       integer,
  thumbnail_url     text,
  email_sent        boolean     DEFAULT false,
  memo              text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- 구독자 수 정렬 조회 성능용 인덱스
CREATE INDEX idx_youtube_channels_subscriber_count
  ON public.youtube_channels (subscriber_count DESC);

-- RLS 활성화
ALTER TABLE public.youtube_channels ENABLE ROW LEVEL SECURITY;

-- service_role: 수집 서비스(admin 클라이언트)가 전체 권한으로 사용
GRANT ALL ON TABLE public.youtube_channels TO service_role;

-- authenticated: GRANT는 열어두되 RLS 정책으로 어드민 계정만 실제 접근 가능하도록 제한
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.youtube_channels TO authenticated;

CREATE POLICY "admin can select youtube_channels"
  ON public.youtube_channels FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'nudgefilm@gmail.com');

CREATE POLICY "admin can insert youtube_channels"
  ON public.youtube_channels FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() ->> 'email') = 'nudgefilm@gmail.com');

CREATE POLICY "admin can update youtube_channels"
  ON public.youtube_channels FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'nudgefilm@gmail.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'nudgefilm@gmail.com');

CREATE POLICY "admin can delete youtube_channels"
  ON public.youtube_channels FOR DELETE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'nudgefilm@gmail.com');
