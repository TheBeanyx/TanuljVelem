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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_games: {
        Row: {
          created_at: string
          creator_id: string
          description: string
          difficulty: string
          grade: number
          html_code: string
          id: string
          subject: string
          title: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          description: string
          difficulty?: string
          grade?: number
          html_code: string
          id?: string
          subject?: string
          title: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          description?: string
          difficulty?: string
          grade?: number
          html_code?: string
          id?: string
          subject?: string
          title?: string
        }
        Relationships: []
      }
      announcement_comments: {
        Row: {
          announcement_id: string
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_comments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          class_name: string | null
          created_at: string
          grade: string | null
          id: string
          image_url: string | null
          message: string
          recipient_id: string | null
          sender_id: string
          subject: string | null
          visibility: string
          weight: string | null
        }
        Insert: {
          class_name?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          image_url?: string | null
          message: string
          recipient_id?: string | null
          sender_id: string
          subject?: string | null
          visibility?: string
          weight?: string | null
        }
        Update: {
          class_name?: string | null
          created_at?: string
          grade?: string | null
          id?: string
          image_url?: string | null
          message?: string
          recipient_id?: string | null
          sender_id?: string
          subject?: string | null
          visibility?: string
          weight?: string | null
        }
        Relationships: []
      }
      class_members: {
        Row: {
          class_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          class_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          class_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      class_messages: {
        Row: {
          class_id: string
          created_at: string
          homework_id: string | null
          id: string
          message_type: string
          text: string
          user_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          homework_id?: string | null
          id?: string
          message_type?: string
          text: string
          user_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          homework_id?: string | null
          id?: string
          message_type?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_messages_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_messages_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homeworks"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          code: string
          created_at: string
          grade: number
          head_teacher_id: string | null
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          code?: string
          created_at?: string
          grade?: number
          head_teacher_id?: string | null
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          code?: string
          created_at?: string
          grade?: number
          head_teacher_id?: string | null
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          created_at: string
          id: string
          receiver_id: string
          reply_to_id: string | null
          sender_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          receiver_id: string
          reply_to_id?: string | null
          sender_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          receiver_id?: string
          reply_to_id?: string | null
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "direct_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_items: {
        Row: {
          back: string
          created_at: string
          emoji: string | null
          front: string
          id: string
          set_id: string
          sort_order: number
        }
        Insert: {
          back: string
          created_at?: string
          emoji?: string | null
          front: string
          id?: string
          set_id: string
          sort_order?: number
        }
        Update: {
          back?: string
          created_at?: string
          emoji?: string | null
          front?: string
          id?: string
          set_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_items_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "flashcard_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_sets: {
        Row: {
          class_id: string | null
          created_at: string
          difficulty: string
          grade: number | null
          id: string
          length: string
          owner_id: string
          source: string
          title: string
          topic: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          difficulty?: string
          grade?: number | null
          id?: string
          length?: string
          owner_id: string
          source?: string
          title: string
          topic?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          difficulty?: string
          grade?: number | null
          id?: string
          length?: string
          owner_id?: string
          source?: string
          title?: string
          topic?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      homeworks: {
        Row: {
          class_id: string | null
          created_at: string
          creator_id: string | null
          deadline: string | null
          description: string | null
          id: string
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          creator_id?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          creator_id?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homeworks_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      learn_notes: {
        Row: {
          class_id: string | null
          created_at: string
          difficulty: string
          grade: number | null
          id: string
          length: string
          markdown: string
          owner_id: string
          source: string
          title: string
          topic: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          class_id?: string | null
          created_at?: string
          difficulty?: string
          grade?: number | null
          id?: string
          length?: string
          markdown: string
          owner_id: string
          source?: string
          title: string
          topic?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          class_id?: string | null
          created_at?: string
          difficulty?: string
          grade?: number | null
          id?: string
          length?: string
          markdown?: string
          owner_id?: string
          source?: string
          title?: string
          topic?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      mentions: {
        Row: {
          class_id: string
          created_at: string
          id: string
          mentioned_user_id: string
          mentioner_user_id: string
          message_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          mentioned_user_id: string
          mentioner_user_id: string
          message_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          mentioned_user_id?: string
          mentioner_user_id?: string
          message_id?: string
        }
        Relationships: []
      }
      point_events: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          points: number
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          points: number
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          points?: number
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          role: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          role?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          username?: string
        }
        Relationships: []
      }
      read_status: {
        Row: {
          channel_id: string
          channel_type: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          channel_type: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          channel_type?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_questions: {
        Row: {
          correct_answer: string
          explanation: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          question_type: string
          sort_order: number
          test_id: string
        }
        Insert: {
          correct_answer: string
          explanation?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          question: string
          question_type?: string
          sort_order?: number
          test_id: string
        }
        Update: {
          correct_answer?: string
          explanation?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          question?: string
          question_type?: string
          sort_order?: number
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          answers: Json
          completed_at: string
          id: string
          percentage: number
          score: number
          test_id: string
          total_questions: number
        }
        Insert: {
          answers?: Json
          completed_at?: string
          id?: string
          percentage: number
          score: number
          test_id: string
          total_questions: number
        }
        Update: {
          answers?: Json
          completed_at?: string
          id?: string
          percentage?: number
          score?: number
          test_id?: string
          total_questions?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          creator_name: string
          grade: number
          id: string
          is_system: boolean
          subject: string
          time_limit_minutes: number
          title: string
        }
        Insert: {
          created_at?: string
          creator_name?: string
          grade?: number
          id?: string
          is_system?: boolean
          subject: string
          time_limit_minutes?: number
          title: string
        }
        Update: {
          created_at?: string
          creator_name?: string
          grade?: number
          id?: string
          is_system?: boolean
          subject?: string
          time_limit_minutes?: number
          title?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: string
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          created_at: string
          current_streak: number
          last_activity_date: string | null
          longest_streak: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          last_activity_date?: string | null
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          last_activity_date?: string | null
          longest_streak?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
