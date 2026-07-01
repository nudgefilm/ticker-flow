export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          alert_type: string
          enabled: boolean
          id: string
          ticker: string
          user_id: string
        }
        Insert: {
          alert_type: string
          enabled?: boolean
          id?: string
          ticker: string
          user_id: string
        }
        Update: {
          alert_type?: string
          enabled?: boolean
          id?: string
          ticker?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      analysis_reports: {
        Row: {
          filing_id: string
          generated_at: string
          id: string
          report_kr: string | null
        }
        Insert: {
          filing_id: string
          generated_at?: string
          id?: string
          report_kr?: string | null
        }
        Update: {
          filing_id?: string
          generated_at?: string
          id?: string
          report_kr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_reports_filing_id_fkey"
            columns: ["filing_id"]
            isOneToOne: true
            referencedRelation: "filings"
            referencedColumns: ["id"]
          },
        ]
      }
      analyst_ratings: {
        Row: {
          buy: number | null
          collected_at: string | null
          hold: number | null
          id: string
          period: string | null
          sell: number | null
          strong_buy: number | null
          strong_sell: number | null
          ticker: string
        }
        Insert: {
          buy?: number | null
          collected_at?: string | null
          hold?: number | null
          id?: string
          period?: string | null
          sell?: number | null
          strong_buy?: number | null
          strong_sell?: number | null
          ticker: string
        }
        Update: {
          buy?: number | null
          collected_at?: string | null
          hold?: number | null
          id?: string
          period?: string | null
          sell?: number | null
          strong_buy?: number | null
          strong_sell?: number | null
          ticker?: string
        }
        Relationships: [
          {
            foreignKeyName: "analyst_ratings_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      collect_runs: {
        Row: {
          error_msg: string | null
          finished_at: string | null
          id: string
          job_type: string
          result: Json | null
          source: string
          started_at: string | null
          status: string
        }
        Insert: {
          error_msg?: string | null
          finished_at?: string | null
          id?: string
          job_type: string
          result?: Json | null
          source?: string
          started_at?: string | null
          status?: string
        }
        Update: {
          error_msg?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          result?: Json | null
          source?: string
          started_at?: string | null
          status?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          answer: string | null
          answered_at: string | null
          created_at: string | null
          email: string
          id: string
          message: string
          status: string | null
          subject: string
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          message: string
          status?: string | null
          subject: string
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          status?: string | null
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      dividends: {
        Row: {
          collected_at: string | null
          dividend: number | null
          ex_date: string | null
          id: string
          payment_date: string | null
          record_date: string | null
          ticker: string
          yield: number | null
        }
        Insert: {
          collected_at?: string | null
          dividend?: number | null
          ex_date?: string | null
          id?: string
          payment_date?: string | null
          record_date?: string | null
          ticker: string
          yield?: number | null
        }
        Update: {
          collected_at?: string | null
          dividend?: number | null
          ex_date?: string | null
          id?: string
          payment_date?: string | null
          record_date?: string | null
          ticker?: string
          yield?: number | null
        }
        Relationships: []
      }
      earnings: {
        Row: {
          actual_eps: number | null
          actual_revenue: number | null
          collected_at: string | null
          eps_estimate: number | null
          id: string
          report_date: string
          revenue_estimate: number | null
          ticker: string
          time_of_day: string | null
        }
        Insert: {
          actual_eps?: number | null
          actual_revenue?: number | null
          collected_at?: string | null
          eps_estimate?: number | null
          id?: string
          report_date: string
          revenue_estimate?: number | null
          ticker: string
          time_of_day?: string | null
        }
        Update: {
          actual_eps?: number | null
          actual_revenue?: number | null
          collected_at?: string | null
          eps_estimate?: number | null
          id?: string
          report_date?: string
          revenue_estimate?: number | null
          ticker?: string
          time_of_day?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      earnings_calls: {
        Row: {
          call_date: string | null
          eps_actual: string | null
          eps_estimate: string | null
          fiscal_quarter: number
          fiscal_year: number
          guidance_direction: string | null
          guidance_previous: string | null
          guidance_summary: string | null
          has_earnings_release: boolean | null
          headline_summary: string | null
          id: string
          key_points: Json | null
          key_statements: Json | null
          keyword_changes: Json | null
          keywords: string[] | null
          management_tone: string | null
          processed_at: string | null
          qa_pairs: Json | null
          quarter: string | null
          revenue_actual: string | null
          revenue_estimate: string | null
          source_url: string | null
          summary_generated_at: string | null
          summary_kr: string | null
          surprise_percent: number | null
          ticker: string
          tone_change: string | null
          tone_current: string | null
          tone_previous: string | null
          transcript_url: string | null
        }
        Insert: {
          call_date?: string | null
          eps_actual?: string | null
          eps_estimate?: string | null
          fiscal_quarter: number
          fiscal_year: number
          guidance_direction?: string | null
          guidance_previous?: string | null
          guidance_summary?: string | null
          has_earnings_release?: boolean | null
          headline_summary?: string | null
          id?: string
          key_points?: Json | null
          key_statements?: Json | null
          keyword_changes?: Json | null
          keywords?: string[] | null
          management_tone?: string | null
          processed_at?: string | null
          qa_pairs?: Json | null
          quarter?: string | null
          revenue_actual?: string | null
          revenue_estimate?: string | null
          source_url?: string | null
          summary_generated_at?: string | null
          summary_kr?: string | null
          surprise_percent?: number | null
          ticker: string
          tone_change?: string | null
          tone_current?: string | null
          tone_previous?: string | null
          transcript_url?: string | null
        }
        Update: {
          call_date?: string | null
          eps_actual?: string | null
          eps_estimate?: string | null
          fiscal_quarter?: number
          fiscal_year?: number
          guidance_direction?: string | null
          guidance_previous?: string | null
          guidance_summary?: string | null
          has_earnings_release?: boolean | null
          headline_summary?: string | null
          id?: string
          key_points?: Json | null
          key_statements?: Json | null
          keyword_changes?: Json | null
          keywords?: string[] | null
          management_tone?: string | null
          processed_at?: string | null
          qa_pairs?: Json | null
          quarter?: string | null
          revenue_actual?: string | null
          revenue_estimate?: string | null
          source_url?: string | null
          summary_generated_at?: string | null
          summary_kr?: string | null
          surprise_percent?: number | null
          ticker?: string
          tone_change?: string | null
          tone_current?: string | null
          tone_previous?: string | null
          transcript_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_calls_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      filings: {
        Row: {
          event_type: string | null
          filed_at: string
          form_type: string
          id: string
          notified_telegram: boolean
          summary_kr: string | null
          ticker: string
          title: string | null
          url: string | null
        }
        Insert: {
          event_type?: string | null
          filed_at: string
          form_type: string
          id?: string
          notified_telegram?: boolean
          summary_kr?: string | null
          ticker: string
          title?: string | null
          url?: string | null
        }
        Update: {
          event_type?: string | null
          filed_at?: string
          form_type?: string
          id?: string
          notified_telegram?: boolean
          summary_kr?: string | null
          ticker?: string
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filings_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      insider_trades: {
        Row: {
          filed_at: string | null
          id: string
          name: string | null
          price: number | null
          shares: number | null
          ticker: string
          title: string | null
          transaction_date: string | null
          transaction_type: string
          value: number | null
        }
        Insert: {
          filed_at?: string | null
          id?: string
          name?: string | null
          price?: number | null
          shares?: number | null
          ticker: string
          title?: string | null
          transaction_date?: string | null
          transaction_type: string
          value?: number | null
        }
        Update: {
          filed_at?: string | null
          id?: string
          name?: string | null
          price?: number | null
          shares?: number | null
          ticker?: string
          title?: string | null
          transaction_date?: string | null
          transaction_type?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "insider_trades_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      institutional_holdings: {
        Row: {
          filed_at: string | null
          id: string
          institution_name: string | null
          quarter: string | null
          shares: number | null
          ticker: string
          value: number | null
        }
        Insert: {
          filed_at?: string | null
          id?: string
          institution_name?: string | null
          quarter?: string | null
          shares?: number | null
          ticker: string
          value?: number | null
        }
        Update: {
          filed_at?: string | null
          id?: string
          institution_name?: string | null
          quarter?: string | null
          shares?: number | null
          ticker?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "institutional_holdings_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      macro_indicators: {
        Row: {
          id: string
          indicator_name: string
          previous_value: number | null
          released_at: string
          source: string | null
          value: number | null
        }
        Insert: {
          id?: string
          indicator_name: string
          previous_value?: number | null
          released_at: string
          source?: string | null
          value?: number | null
        }
        Update: {
          id?: string
          indicator_name?: string
          previous_value?: number | null
          released_at?: string
          source?: string | null
          value?: number | null
        }
        Relationships: []
      }
      news: {
        Row: {
          headline: string
          id: string
          published_at: string
          source: string | null
          summary_kr: string | null
          ticker: string | null
          url: string | null
        }
        Insert: {
          headline: string
          id?: string
          published_at: string
          source?: string | null
          summary_kr?: string | null
          ticker?: string | null
          url?: string | null
        }
        Update: {
          headline?: string
          id?: string
          published_at?: string
          source?: string | null
          summary_kr?: string | null
          ticker?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      notices: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          link_text: string | null
          link_url: string | null
          message: string
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          link_text?: string | null
          link_url?: string | null
          message: string
          type?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          link_text?: string | null
          link_url?: string | null
          message?: string
          type?: string
        }
        Relationships: []
      }
      price_targets: {
        Row: {
          adj_price_target: number | null
          analyst_company: string | null
          collected_at: string | null
          id: string
          price_target: number | null
          published_date: string | null
          ticker: string
        }
        Insert: {
          adj_price_target?: number | null
          analyst_company?: string | null
          collected_at?: string | null
          id?: string
          price_target?: number | null
          published_date?: string | null
          ticker: string
        }
        Update: {
          adj_price_target?: number | null
          analyst_company?: string | null
          collected_at?: string | null
          id?: string
          price_target?: number | null
          published_date?: string | null
          ticker?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          plan: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          plan?: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          plan?: string
        }
        Relationships: []
      }
      short_interest: {
        Row: {
          collected_at: string
          id: string
          short_float: number | null
          short_ratio: number | null
          ticker: string
        }
        Insert: {
          collected_at?: string
          id?: string
          short_float?: number | null
          short_ratio?: number | null
          ticker: string
        }
        Update: {
          collected_at?: string
          id?: string
          short_float?: number | null
          short_ratio?: number | null
          ticker?: string
        }
        Relationships: []
      }
      stock_briefs: {
        Row: {
          content: string
          generated_at: string
          id: string
          source_period_end: string | null
          source_period_start: string | null
          ticker: string
          trigger_reason: string | null
        }
        Insert: {
          content: string
          generated_at?: string
          id?: string
          source_period_end?: string | null
          source_period_start?: string | null
          ticker: string
          trigger_reason?: string | null
        }
        Update: {
          content?: string
          generated_at?: string
          id?: string
          source_period_end?: string | null
          source_period_start?: string | null
          ticker?: string
          trigger_reason?: string | null
        }
        Relationships: []
      }
      stock_prices: {
        Row: {
          change_pct: number | null
          close: number
          collected_at: string | null
          date: string
          ticker: string
          volume: number | null
        }
        Insert: {
          change_pct?: number | null
          close: number
          collected_at?: string | null
          date: string
          ticker: string
          volume?: number | null
        }
        Update: {
          change_pct?: number | null
          close?: number
          collected_at?: string | null
          date?: string
          ticker?: string
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_prices_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
      stock_splits: {
        Row: {
          collected_at: string | null
          denominator: number | null
          id: string
          numerator: number | null
          split_date: string | null
          ticker: string
        }
        Insert: {
          collected_at?: string | null
          denominator?: number | null
          id?: string
          numerator?: number | null
          split_date?: string | null
          ticker: string
        }
        Update: {
          collected_at?: string | null
          denominator?: number | null
          id?: string
          numerator?: number | null
          split_date?: string | null
          ticker?: string
        }
        Relationships: []
      }
      tickers: {
        Row: {
          exchange: string | null
          industry: string | null
          name_en: string
          name_kr: string | null
          sector: string | null
          ticker: string
        }
        Insert: {
          exchange?: string | null
          industry?: string | null
          name_en: string
          name_kr?: string | null
          sector?: string | null
          ticker: string
        }
        Update: {
          exchange?: string | null
          industry?: string | null
          name_en?: string
          name_kr?: string | null
          sector?: string | null
          ticker?: string
        }
        Relationships: []
      }
      top30_daily: {
        Row: {
          date: string
          earnings_score: number | null
          event_score: number | null
          final_score: number | null
          id: string
          market_score: number | null
          metadata: Json | null
          rank: number | null
          reason_tags: string[] | null
          smart_score: number | null
          ticker: string
          updated_at: string
        }
        Insert: {
          date?: string
          earnings_score?: number | null
          event_score?: number | null
          final_score?: number | null
          id?: string
          market_score?: number | null
          metadata?: Json | null
          rank?: number | null
          reason_tags?: string[] | null
          smart_score?: number | null
          ticker: string
          updated_at?: string
        }
        Update: {
          date?: string
          earnings_score?: number | null
          event_score?: number | null
          final_score?: number | null
          id?: string
          market_score?: number | null
          metadata?: Json | null
          rank?: number | null
          reason_tags?: string[] | null
          smart_score?: number | null
          ticker?: string
          updated_at?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          added_at: string
          id: string
          ticker: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          ticker: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          ticker?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_ticker_fkey"
            columns: ["ticker"]
            isOneToOne: false
            referencedRelation: "tickers"
            referencedColumns: ["ticker"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
