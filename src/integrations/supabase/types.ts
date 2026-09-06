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
      ai_analyses: {
        Row: {
          analysis_type: string
          created_at: string
          id: string
          input: Json | null
          item_id: string
          model: string | null
          output: Json | null
          provider: string | null
        }
        Insert: {
          analysis_type?: string
          created_at?: string
          id?: string
          input?: Json | null
          item_id: string
          model?: string | null
          output?: Json | null
          provider?: string | null
        }
        Update: {
          analysis_type?: string
          created_at?: string
          id?: string
          input?: Json | null
          item_id?: string
          model?: string | null
          output?: Json | null
          provider?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_analyses_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      card_images: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_type: string
          item_id: string
          storage_path: string | null
          url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_type?: string
          item_id: string
          storage_path?: string | null
          url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_type?: string
          item_id?: string
          storage_path?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          card_name: string
          card_number: string | null
          card_state: string
          created_at: string
          first_edition: boolean
          graded_certificate: string | null
          graded_company: string | null
          graded_grade: number | null
          holo: boolean
          id: string
          item_id: string
          language: string | null
          notes: string | null
          pokemon_name: string
          promo: boolean
          rarity: string | null
          reverse_holo: boolean
          set_code: string | null
          set_name: string | null
          set_total: string | null
          shadowless: boolean
          unlimited: boolean
          updated_at: string
          variant: string | null
          year: number | null
        }
        Insert: {
          card_name?: string
          card_number?: string | null
          card_state?: string
          created_at?: string
          first_edition?: boolean
          graded_certificate?: string | null
          graded_company?: string | null
          graded_grade?: number | null
          holo?: boolean
          id?: string
          item_id: string
          language?: string | null
          notes?: string | null
          pokemon_name?: string
          promo?: boolean
          rarity?: string | null
          reverse_holo?: boolean
          set_code?: string | null
          set_name?: string | null
          set_total?: string | null
          shadowless?: boolean
          unlimited?: boolean
          updated_at?: string
          variant?: string | null
          year?: number | null
        }
        Update: {
          card_name?: string
          card_number?: string | null
          card_state?: string
          created_at?: string
          first_edition?: boolean
          graded_certificate?: string | null
          graded_company?: string | null
          graded_grade?: number | null
          holo?: boolean
          id?: string
          item_id?: string
          language?: string | null
          notes?: string | null
          pokemon_name?: string
          promo?: boolean
          rarity?: string | null
          reverse_holo?: boolean
          set_code?: string | null
          set_name?: string | null
          set_total?: string | null
          shadowless?: boolean
          unlimited?: boolean
          updated_at?: string
          variant?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      condition_assessments: {
        Row: {
          centering_back: string | null
          centering_front: string | null
          corners: string | null
          creases: string | null
          created_at: string
          dents: string | null
          edges: string | null
          id: string
          item_id: string
          notes: string | null
          overall_condition: string | null
          print_lines: string | null
          scratches: string | null
          stains: string | null
          surface_back: string | null
          surface_front: string | null
          whitening: string | null
        }
        Insert: {
          centering_back?: string | null
          centering_front?: string | null
          corners?: string | null
          creases?: string | null
          created_at?: string
          dents?: string | null
          edges?: string | null
          id?: string
          item_id: string
          notes?: string | null
          overall_condition?: string | null
          print_lines?: string | null
          scratches?: string | null
          stains?: string | null
          surface_back?: string | null
          surface_front?: string | null
          whitening?: string | null
        }
        Update: {
          centering_back?: string | null
          centering_front?: string | null
          corners?: string | null
          creases?: string | null
          created_at?: string
          dents?: string | null
          edges?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          overall_condition?: string | null
          print_lines?: string | null
          scratches?: string | null
          stains?: string | null
          surface_back?: string | null
          surface_front?: string | null
          whitening?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "condition_assessments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_assessments: {
        Row: {
          actual_company: string | null
          actual_grade: number | null
          actual_grading_cost: number | null
          certificate_number: string | null
          confidence: number | null
          created_at: string
          graded_at: string | null
          grading_company: string
          grading_cost: number | null
          id: string
          item_id: string
          max_grade: number | null
          min_grade: number | null
          notes: string | null
          prob_psa1: number
          prob_psa10: number
          prob_psa2: number
          prob_psa3: number
          prob_psa4: number
          prob_psa5: number
          prob_psa6: number
          prob_psa7: number
          prob_psa8: number
          prob_psa9: number
          probable_grade: number | null
          recommendation: string | null
          result_notes: string | null
          returned_at: string | null
          submitted_at: string | null
        }
        Insert: {
          actual_company?: string | null
          actual_grade?: number | null
          actual_grading_cost?: number | null
          certificate_number?: string | null
          confidence?: number | null
          created_at?: string
          graded_at?: string | null
          grading_company?: string
          grading_cost?: number | null
          id?: string
          item_id: string
          max_grade?: number | null
          min_grade?: number | null
          notes?: string | null
          prob_psa1?: number
          prob_psa10?: number
          prob_psa2?: number
          prob_psa3?: number
          prob_psa4?: number
          prob_psa5?: number
          prob_psa6?: number
          prob_psa7?: number
          prob_psa8?: number
          prob_psa9?: number
          probable_grade?: number | null
          recommendation?: string | null
          result_notes?: string | null
          returned_at?: string | null
          submitted_at?: string | null
        }
        Update: {
          actual_company?: string | null
          actual_grade?: number | null
          actual_grading_cost?: number | null
          certificate_number?: string | null
          confidence?: number | null
          created_at?: string
          graded_at?: string | null
          grading_company?: string
          grading_cost?: number | null
          id?: string
          item_id?: string
          max_grade?: number | null
          min_grade?: number | null
          notes?: string | null
          prob_psa1?: number
          prob_psa10?: number
          prob_psa2?: number
          prob_psa3?: number
          prob_psa4?: number
          prob_psa5?: number
          prob_psa6?: number
          prob_psa7?: number
          prob_psa8?: number
          prob_psa9?: number
          probable_grade?: number | null
          recommendation?: string | null
          result_notes?: string | null
          returned_at?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grading_assessments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_decisions: {
        Row: {
          buy_it_now_price: number | null
          created_at: string
          currency: string
          decision: string
          id: string
          item_id: string
          min_acceptable_price: number | null
          rationale: string | null
          updated_at: string
        }
        Insert: {
          buy_it_now_price?: number | null
          created_at?: string
          currency?: string
          decision?: string
          id?: string
          item_id: string
          min_acceptable_price?: number | null
          rationale?: string | null
          updated_at?: string
        }
        Update: {
          buy_it_now_price?: number | null
          created_at?: string
          currency?: string
          decision?: string
          id?: string
          item_id?: string
          min_acceptable_price?: number | null
          rationale?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_decisions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          bucket: string
          created_at: string
          id: string
          is_demo: boolean
          item_type: string
          notes: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bucket?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          item_type: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          item_type?: string
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      market_prices: {
        Row: {
          created_at: string
          currency: string
          id: string
          item_id: string
          observed_at: string
          price_type: string
          source: string | null
          value: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          item_id: string
          observed_at?: string
          price_type: string
          source?: string | null
          value?: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          item_id?: string
          observed_at?: string
          price_type?: string
          source?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "market_prices_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_snapshots: {
        Row: {
          cost_basis: number
          created_at: string
          currency: string
          id: string
          item_count: number
          profit_loss: number
          raw_value: number
          sealed_value: number
          slab_value: number
          snapshot_date: string
          total_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_basis?: number
          created_at?: string
          currency?: string
          id?: string
          item_count?: number
          profit_loss?: number
          raw_value?: number
          sealed_value?: number
          slab_value?: number
          snapshot_date?: string
          total_value?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_basis?: number
          created_at?: string
          currency?: string
          id?: string
          item_count?: number
          profit_loss?: number
          raw_value?: number
          sealed_value?: number
          slab_value?: number
          snapshot_date?: string
          total_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_sources: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          last_run_message: string | null
          last_run_status: string | null
          notes: string | null
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          last_run_message?: string | null
          last_run_status?: string | null
          notes?: string | null
          provider?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          last_run_message?: string | null
          last_run_status?: string | null
          notes?: string | null
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          allocated_cost: number
          created_at: string
          id: string
          item_id: string
          notes: string | null
          purchase_id: string
        }
        Insert: {
          allocated_cost?: number
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          purchase_id: string
        }
        Update: {
          allocated_cost?: number
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          purchase_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          created_at: string
          currency: string
          fees: number
          id: string
          is_demo: boolean
          item_price: number
          notes: string | null
          platform: string | null
          purchase_date: string
          seller: string | null
          shipping: number
          taxes: number
          total_cost: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          fees?: number
          id?: string
          is_demo?: boolean
          item_price?: number
          notes?: string | null
          platform?: string | null
          purchase_date?: string
          seller?: string | null
          shipping?: number
          taxes?: number
          total_cost?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          fees?: number
          id?: string
          is_demo?: boolean
          item_price?: number
          notes?: string | null
          platform?: string | null
          purchase_date?: string
          seller?: string | null
          shipping?: number
          taxes?: number
          total_cost?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          allocated_revenue: number
          created_at: string
          id: string
          item_id: string
          notes: string | null
          sale_id: string
        }
        Insert: {
          allocated_revenue?: number
          created_at?: string
          id?: string
          item_id: string
          notes?: string | null
          sale_id: string
        }
        Update: {
          allocated_revenue?: number
          created_at?: string
          id?: string
          item_id?: string
          notes?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          buyer: string | null
          created_at: string
          currency: string
          fees: number
          gross_revenue: number
          id: string
          is_demo: boolean
          net_revenue: number
          notes: string | null
          platform: string | null
          sale_date: string
          shipping: number
          taxes: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          buyer?: string | null
          created_at?: string
          currency?: string
          fees?: number
          gross_revenue?: number
          id?: string
          is_demo?: boolean
          net_revenue?: number
          notes?: string | null
          platform?: string | null
          sale_date?: string
          shipping?: number
          taxes?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          buyer?: string | null
          created_at?: string
          currency?: string
          fees?: number
          gross_revenue?: number
          id?: string
          is_demo?: boolean
          net_revenue?: number
          notes?: string | null
          platform?: string | null
          sale_date?: string
          shipping?: number
          taxes?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      sealed_products: {
        Row: {
          created_at: string
          id: string
          item_id: string
          language: string | null
          name: string
          notes: string | null
          package_condition: string | null
          product_type: string
          quantity: number
          sealed_status: string | null
          set_name: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          language?: string | null
          name?: string
          notes?: string | null
          package_condition?: string | null
          product_type?: string
          quantity?: number
          sealed_status?: string | null
          set_name?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          language?: string | null
          name?: string
          notes?: string | null
          package_condition?: string | null
          product_type?: string
          quantity?: number
          sealed_status?: string | null
          set_name?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sealed_products_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: true
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      item_owned: { Args: { _item: string }; Returns: boolean }
      item_visible: { Args: { _item: string }; Returns: boolean }
      purchase_owned: { Args: { _p: string }; Returns: boolean }
      purchase_visible: { Args: { _p: string }; Returns: boolean }
      sale_owned: { Args: { _s: string }; Returns: boolean }
      sale_visible: { Args: { _s: string }; Returns: boolean }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
