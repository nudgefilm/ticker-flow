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
      earnings: {
        Row: {
          actual_eps: number | null
          actual_revenue: number | null
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
          fiscal_quarter: number
          fiscal_year: number
          id: string
          key_points: Json | null
          processed_at: string | null
          source_url: string | null
          summary_kr: string | null
          ticker: string
          tone_change: string | null
        }
        Insert: {
          fiscal_quarter: number
          fiscal_year: number
          id?: string
          key_points?: Json | null
          processed_at?: string | null
          source_url?: string | null
          summary_kr?: string | null
          ticker: string
          tone_change?: string | null
        }
        Update: {
          fiscal_quarter?: number
          fiscal_year?: number
          id?: string
          key_points?: Json | null
          processed_at?: string | null
          source_url?: string | null
          summary_kr?: string | null
          ticker?: string
          tone_change?: string | null
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
      stock_prices: {
        Row: {
          change_pct: number | null
          close: number
          date: string
          ticker: string
          volume: number | null
        }
        Insert: {
          change_pct?: number | null
          close: number
          date: string
          ticker: string
          volume?: number | null
        }
        Update: {
          change_pct?: number | null
          close?: number
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
