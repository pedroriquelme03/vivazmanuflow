export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      demanda_anexos: {
        Row: {
          criado_em: string
          demanda_id: string
          enviado_por: Database["public"]["Enums"]["anexo_autor"]
          id: string
          tipo: Database["public"]["Enums"]["anexo_tipo"]
          url: string
        }
        Insert: {
          criado_em?: string
          demanda_id: string
          enviado_por: Database["public"]["Enums"]["anexo_autor"]
          id?: string
          tipo?: Database["public"]["Enums"]["anexo_tipo"]
          url: string
        }
        Update: {
          criado_em?: string
          demanda_id?: string
          enviado_por?: Database["public"]["Enums"]["anexo_autor"]
          id?: string
          tipo?: Database["public"]["Enums"]["anexo_tipo"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "demanda_anexos_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
        ]
      }
      demanda_historico: {
        Row: {
          criado_em: string
          demanda_id: string
          id: string
          observacao: string | null
          status_anterior: Database["public"]["Enums"]["demanda_status"] | null
          status_novo: Database["public"]["Enums"]["demanda_status"]
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          demanda_id: string
          id?: string
          observacao?: string | null
          status_anterior?: Database["public"]["Enums"]["demanda_status"] | null
          status_novo: Database["public"]["Enums"]["demanda_status"]
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          demanda_id?: string
          id?: string
          observacao?: string | null
          status_anterior?: Database["public"]["Enums"]["demanda_status"] | null
          status_novo?: Database["public"]["Enums"]["demanda_status"]
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demanda_historico_demanda_id_fkey"
            columns: ["demanda_id"]
            isOneToOne: false
            referencedRelation: "demandas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demanda_historico_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      demandas: {
        Row: {
          atribuido_em: string | null
          colaborador_id: string | null
          concluido_em: string | null
          criado_em: string
          descricao: string | null
          id: string
          iniciado_em: string | null
          local_id: string | null
          motivo_nao_conclusao: string | null
          prazo_confirmado: string | null
          prazo_sugerido: string | null
          prioridade: Database["public"]["Enums"]["demanda_prioridade"]
          propriedade_id: string
          solicitante_id: string
          status: Database["public"]["Enums"]["demanda_status"]
          titulo: string
          token_acompanhamento: string
        }
        Insert: {
          atribuido_em?: string | null
          colaborador_id?: string | null
          concluido_em?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          iniciado_em?: string | null
          local_id?: string | null
          motivo_nao_conclusao?: string | null
          prazo_confirmado?: string | null
          prazo_sugerido?: string | null
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          propriedade_id: string
          solicitante_id: string
          status?: Database["public"]["Enums"]["demanda_status"]
          titulo: string
          token_acompanhamento?: string
        }
        Update: {
          atribuido_em?: string | null
          colaborador_id?: string | null
          concluido_em?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          iniciado_em?: string | null
          local_id?: string | null
          motivo_nao_conclusao?: string | null
          prazo_confirmado?: string | null
          prazo_sugerido?: string | null
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          propriedade_id?: string
          solicitante_id?: string
          status?: Database["public"]["Enums"]["demanda_status"]
          titulo?: string
          token_acompanhamento?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "solicitantes"
            referencedColumns: ["id"]
          },
        ]
      }
      locais: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          propriedade_id: string
          setor_id: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          propriedade_id: string
          setor_id?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          propriedade_id?: string
          setor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locais_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locais_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      propriedades: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      setores: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          propriedade_id: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          propriedade_id?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          propriedade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setores_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_config: {
        Row: {
          horas_padrao: number
          id: string
          prioridade: Database["public"]["Enums"]["demanda_prioridade"]
          propriedade_id: string | null
        }
        Insert: {
          horas_padrao: number
          id?: string
          prioridade: Database["public"]["Enums"]["demanda_prioridade"]
          propriedade_id?: string | null
        }
        Update: {
          horas_padrao?: number
          id?: string
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          propriedade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sla_config_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitantes: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          propriedade_id: string
          setor_id: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          propriedade_id: string
          setor_id?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          propriedade_id?: string
          setor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitantes_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitantes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          criado_em: string
          foto_url: string | null
          id: string
          nome: string
          propriedade_id: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          foto_url?: string | null
          id: string
          nome: string
          propriedade_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          foto_url?: string | null
          id?: string
          nome?: string
          propriedade_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abrir_demanda: {
        Args: {
          p_anexos?: Json
          p_descricao?: string
          p_local_id?: string
          p_prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          p_solicitante_id: string
          p_titulo: string
        }
        Returns: {
          demanda_id: string
          token: string
        }[]
      }
      acompanhar_demanda: { Args: { p_token: string }; Returns: Json }
      admin_criar_usuario: {
        Args: {
          p_email: string
          p_senha: string
          p_nome: string
          p_role?: Database["public"]["Enums"]["user_role"]
          p_propriedade_id?: string
        }
        Returns: string
      }
      admin_redefinir_senha: {
        Args: { p_user_id: string; p_senha: string }
        Returns: undefined
      }
      metricas: {
        Args: { p_inicio: string; p_fim: string }
        Returns: Json
      }
      historico_solicitante: {
        Args: { p_solicitante_id: string }
        Returns: {
          concluido_em: string
          criado_em: string
          id: string
          local: string
          prioridade: Database["public"]["Enums"]["demanda_prioridade"]
          status: Database["public"]["Enums"]["demanda_status"]
          titulo: string
          token: string
        }[]
      }
    }
    Enums: {
      anexo_autor: "solicitante" | "colaborador"
      anexo_tipo: "foto" | "video"
      demanda_prioridade: "alta" | "media" | "baixa"
      demanda_status:
        | "aberta"
        | "atribuida"
        | "em_andamento"
        | "aguardando_validacao"
        | "concluida"
        | "cancelada"
      user_role: "admin" | "lider" | "colaborador"
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
    Enums: {
      anexo_autor: ["solicitante", "colaborador"],
      anexo_tipo: ["foto", "video"],
      demanda_prioridade: ["alta", "media", "baixa"],
      demanda_status: [
        "aberta",
        "atribuida",
        "em_andamento",
        "aguardando_validacao",
        "concluida",
        "cancelada",
      ],
      user_role: ["admin", "lider", "colaborador"],
    },
  },
} as const
