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
      demanda_mensagens: {
        Row: {
          autor: string
          autor_id: string | null
          autor_nome: string
          criado_em: string
          demanda_id: string
          id: string
          texto: string
        }
        Insert: {
          autor: string
          autor_id?: string | null
          autor_nome: string
          criado_em?: string
          demanda_id: string
          id?: string
          texto: string
        }
        Update: {
          autor?: string
          autor_id?: string | null
          autor_nome?: string
          criado_em?: string
          demanda_id?: string
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "demanda_mensagens_demanda_id_fkey"
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
          peso: number
          afeta_experiencia: boolean
          evento_id: string | null
          projeto_id: string | null
          preventiva_id: string | null
          sistema_id: string | null
          arquivado: boolean
          sublocal: string | null
          mensagem_devolucao: string | null
          ambiente: Database["public"]["Enums"]["ambiente_equipe"]
          sentry_issue_id: string | null
          sentry_ocorrencias: number | null
          sentry_usuarios: number | null
          sentry_primeira_em: string | null
          sentry_ultima_em: string | null
          sentry_rota: string | null
          sentry_quadro: string | null
          sentry_url: string | null
          sentry_posthog_url: string | null
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
          peso?: number
          afeta_experiencia?: boolean
          evento_id?: string | null
          projeto_id?: string | null
          preventiva_id?: string | null
          sistema_id?: string | null
          arquivado?: boolean
          sublocal?: string | null
          mensagem_devolucao?: string | null
          ambiente?: Database["public"]["Enums"]["ambiente_equipe"]
          sentry_issue_id?: string | null
          sentry_ocorrencias?: number | null
          sentry_usuarios?: number | null
          sentry_primeira_em?: string | null
          sentry_ultima_em?: string | null
          sentry_rota?: string | null
          sentry_quadro?: string | null
          sentry_url?: string | null
          sentry_posthog_url?: string | null
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
          peso?: number
          afeta_experiencia?: boolean
          evento_id?: string | null
          projeto_id?: string | null
          preventiva_id?: string | null
          sistema_id?: string | null
          arquivado?: boolean
          sublocal?: string | null
          mensagem_devolucao?: string | null
          ambiente?: Database["public"]["Enums"]["ambiente_equipe"]
          sentry_issue_id?: string | null
          sentry_ocorrencias?: number | null
          sentry_usuarios?: number | null
          sentry_primeira_em?: string | null
          sentry_ultima_em?: string | null
          sentry_rota?: string | null
          sentry_quadro?: string | null
          sentry_url?: string | null
          sentry_posthog_url?: string | null
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
            foreignKeyName: "demandas_evento_id_fkey"
            columns: ["evento_id"]
            isOneToOne: false
            referencedRelation: "eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
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
          {
            foreignKeyName: "demandas_sistema_id_fkey"
            columns: ["sistema_id"]
            isOneToOne: false
            referencedRelation: "sistemas"
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
      demandas_predefinidas: {
        Row: {
          id: string
          titulo: string
          descricao: string | null
          prioridade: Database["public"]["Enums"]["demanda_prioridade"]
          colaborador_id: string
          propriedade_id: string | null
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          titulo: string
          descricao?: string | null
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          colaborador_id: string
          propriedade_id?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          titulo?: string
          descricao?: string | null
          prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          colaborador_id?: string
          propriedade_id?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "demandas_predefinidas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demandas_predefinidas_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
        ]
      }
      eventos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          data_inicio: string | null
          data_fim: string | null
          propriedade_id: string | null
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          data_inicio?: string | null
          data_fim?: string | null
          propriedade_id?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          data_inicio?: string | null
          data_fim?: string | null
          propriedade_id?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "eventos_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
        ]
      }
      sistemas: {
        Row: {
          id: string
          nome: string
          slug: string | null
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          nome: string
          slug?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          slug?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Relationships: []
      }
      sentry_alertas_log: {
        Row: {
          id: string
          criado_em: string
          slug: string | null
          issue_id: string | null
          acao: string
          detalhe: string | null
        }
        Insert: {
          id?: string
          criado_em?: string
          slug?: string | null
          issue_id?: string | null
          acao: string
          detalhe?: string | null
        }
        Update: {
          id?: string
          criado_em?: string
          slug?: string | null
          issue_id?: string | null
          acao?: string
          detalhe?: string | null
        }
        Relationships: []
      }
      push_inscricoes: {
        Row: {
          id: string
          usuario_id: string
          endpoint: string
          p256dh: string
          auth: string
          criado_em: string
        }
        Insert: {
          id?: string
          usuario_id: string
          endpoint: string
          p256dh: string
          auth: string
          criado_em?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_inscricoes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      preventiva_locais: {
        Row: {
          id: string
          nome: string
          propriedade_id: string
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          nome: string
          propriedade_id: string
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          propriedade_id?: string
          ativo?: boolean
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "preventiva_locais_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
        ]
      }
      preventivas: {
        Row: {
          id: string
          local_id: string
          titulo: string
          descricao: string | null
          intervalo_quantidade: number
          intervalo_unidade: string
          proxima_abertura: string
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          local_id: string
          titulo: string
          descricao?: string | null
          intervalo_quantidade?: number
          intervalo_unidade?: string
          proxima_abertura: string
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          local_id?: string
          titulo?: string
          descricao?: string | null
          intervalo_quantidade?: number
          intervalo_unidade?: string
          proxima_abertura?: string
          ativo?: boolean
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "preventivas_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "preventiva_locais"
            referencedColumns: ["id"]
          },
        ]
      }
      projetos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          propriedade_id: string | null
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          propriedade_id?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          propriedade_id?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "projetos_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
        ]
      }
      projeto_membros: {
        Row: {
          projeto_id: string
          usuario_id: string
        }
        Insert: {
          projeto_id: string
          usuario_id: string
        }
        Update: {
          projeto_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projeto_membros_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projetos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projeto_membros_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_areas: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          propriedade_id: string | null
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          propriedade_id?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          propriedade_id?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_areas_propriedade_id_fkey"
            columns: ["propriedade_id"]
            isOneToOne: false
            referencedRelation: "propriedades"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          id: string
          area_id: string
          nome: string
          codigo: string
          descricao: string | null
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          area_id: string
          nome: string
          codigo: string
          descricao?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          area_id?: string
          nome?: string
          codigo?: string
          descricao?: string | null
          ativo?: boolean
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "hotel_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamento_manutencoes: {
        Row: {
          id: string
          equipamento_id: string
          tipo: string
          descricao: string
          foto_url: string | null
          realizado_por: string | null
          realizado_em: string
          criado_em: string
        }
        Insert: {
          id?: string
          equipamento_id: string
          tipo?: string
          descricao: string
          foto_url?: string | null
          realizado_por?: string | null
          realizado_em?: string
          criado_em?: string
        }
        Update: {
          id?: string
          equipamento_id?: string
          tipo?: string
          descricao?: string
          foto_url?: string | null
          realizado_por?: string | null
          realizado_em?: string
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipamento_manutencoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipamento_manutencoes_realizado_por_fkey"
            columns: ["realizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
      peso_config: {
        Row: {
          id: number
          peso_alta: number
          peso_media: number
          peso_baixa: number
          peso_experiencia: number
          atualizado_em: string
        }
        Insert: {
          id?: number
          peso_alta?: number
          peso_media?: number
          peso_baixa?: number
          peso_experiencia?: number
          atualizado_em?: string
        }
        Update: {
          id?: number
          peso_alta?: number
          peso_media?: number
          peso_baixa?: number
          peso_experiencia?: number
          atualizado_em?: string
        }
        Relationships: []
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
          atualizado_em: string | null
          email: string | null
          foto_url: string | null
          governanca_papel: string | null
          id: string
          nome: string
          propriedade_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          ambientes: Database["public"]["Enums"]["ambiente_equipe"][]
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string | null
          email?: string | null
          foto_url?: string | null
          governanca_papel?: string | null
          id: string
          nome: string
          propriedade_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          ambientes?: Database["public"]["Enums"]["ambiente_equipe"][]
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          atualizado_em?: string | null
          email?: string | null
          foto_url?: string | null
          governanca_papel?: string | null
          id?: string
          nome?: string
          propriedade_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          ambientes?: Database["public"]["Enums"]["ambiente_equipe"][]
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
      requisicoes_acesso: {
        Row: {
          criado_em: string
          email: string
          funcao: string
          id: string
          nome: string
          resolvido_em: string | null
          resolvido_por: string | null
          setor: string
          status: "pendente" | "atendida" | "recusada"
          usuario_id: string | null
        }
        Insert: {
          criado_em?: string
          email: string
          funcao: string
          id?: string
          nome: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          setor: string
          status?: "pendente" | "atendida" | "recusada"
          usuario_id?: string | null
        }
        Update: {
          criado_em?: string
          email?: string
          funcao?: string
          id?: string
          nome?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          setor?: string
          status?: "pendente" | "atendida" | "recusada"
          usuario_id?: string | null
        }
        Relationships: []
      }
      gov_acomodacoes: {
        Row: {
          id: string
          numero: string
          tipo: string
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          numero: string
          tipo: string
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          numero?: string
          tipo?: string
          ativo?: boolean
          criado_em?: string
        }
        Relationships: []
      }
      gov_camareiras: {
        Row: {
          id: string
          nome: string
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          nome: string
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          ativo?: boolean
          criado_em?: string
        }
        Relationships: []
      }
      gov_processos: {
        Row: {
          codigo_origem: string | null
          usa_acomodacao: boolean
          categoria: string | null
          id: string
          nome: string
          descricao: string | null
          tipo: string
          ativo: boolean
          criado_em: string
        }
        Insert: {
          codigo_origem?: string | null
          usa_acomodacao?: boolean
          categoria?: string | null
          id?: string
          nome: string
          descricao?: string | null
          tipo?: string
          ativo?: boolean
          criado_em?: string
        }
        Update: {
          codigo_origem?: string | null
          usa_acomodacao?: boolean
          categoria?: string | null
          id?: string
          nome?: string
          descricao?: string | null
          tipo?: string
          ativo?: boolean
          criado_em?: string
        }
        Relationships: []
      }
      gov_secoes: {
        Row: {
          id: string
          processo_id: string
          nome: string
          ordem: number
          criado_em: string
        }
        Insert: {
          id?: string
          processo_id: string
          nome: string
          ordem?: number
          criado_em?: string
        }
        Update: {
          id?: string
          processo_id?: string
          nome?: string
          ordem?: number
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_secoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "gov_processos"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_perguntas: {
        Row: {
          dica: string | null
          grupo: string | null
          plano_acao: boolean
          obrigatoria: boolean
          permite_na: boolean
          opcoes: string[]
          tipo: string
          id: string
          secao_id: string
          texto: string
          ordem: number
          criado_em: string
        }
        Insert: {
          dica?: string | null
          grupo?: string | null
          plano_acao?: boolean
          obrigatoria?: boolean
          permite_na?: boolean
          opcoes?: string[]
          tipo?: string
          id?: string
          secao_id: string
          texto: string
          ordem?: number
          criado_em?: string
        }
        Update: {
          dica?: string | null
          grupo?: string | null
          plano_acao?: boolean
          obrigatoria?: boolean
          permite_na?: boolean
          opcoes?: string[]
          tipo?: string
          id?: string
          secao_id?: string
          texto?: string
          ordem?: number
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_perguntas_secao_id_fkey"
            columns: ["secao_id"]
            isOneToOne: false
            referencedRelation: "gov_secoes"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_inspecoes: {
        Row: {
          id: string
          processo_id: string
          acomodacao_id: string | null
          tipo: string | null
          camareira_id: string | null
          inspetor_id: string
          status: string
          criado_em: string
          finalizada_em: string | null
        }
        Insert: {
          id?: string
          processo_id: string
          acomodacao_id?: string | null
          tipo?: string | null
          camareira_id?: string | null
          inspetor_id: string
          status?: string
          criado_em?: string
          finalizada_em?: string | null
        }
        Update: {
          id?: string
          processo_id?: string
          acomodacao_id?: string | null
          tipo?: string | null
          camareira_id?: string | null
          inspetor_id?: string
          status?: string
          criado_em?: string
          finalizada_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gov_inspecoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "gov_processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_inspecoes_acomodacao_id_fkey"
            columns: ["acomodacao_id"]
            isOneToOne: false
            referencedRelation: "gov_acomodacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_inspecoes_camareira_id_fkey"
            columns: ["camareira_id"]
            isOneToOne: false
            referencedRelation: "gov_camareiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_inspecoes_inspetor_id_fkey"
            columns: ["inspetor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_respostas: {
        Row: {
          valor: string | null
          pergunta_grupo: string | null
          pergunta_tipo: string
          id: string
          inspecao_id: string
          pergunta_id: string | null
          pergunta_texto: string
          secao_nome: string
          secao_ordem: number
          pergunta_ordem: number
          resposta: string | null
          comentario: string | null
          anexo_url: string | null
          criado_em: string
        }
        Insert: {
          valor?: string | null
          pergunta_grupo?: string | null
          pergunta_tipo?: string
          id?: string
          inspecao_id: string
          pergunta_id?: string | null
          pergunta_texto: string
          secao_nome: string
          secao_ordem?: number
          pergunta_ordem?: number
          resposta?: string | null
          comentario?: string | null
          anexo_url?: string | null
          criado_em?: string
        }
        Update: {
          valor?: string | null
          pergunta_grupo?: string | null
          pergunta_tipo?: string
          id?: string
          inspecao_id?: string
          pergunta_id?: string | null
          pergunta_texto?: string
          secao_nome?: string
          secao_ordem?: number
          pergunta_ordem?: number
          resposta?: string | null
          comentario?: string | null
          anexo_url?: string | null
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_respostas_inspecao_id_fkey"
            columns: ["inspecao_id"]
            isOneToOne: false
            referencedRelation: "gov_inspecoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gov_respostas_pergunta_id_fkey"
            columns: ["pergunta_id"]
            isOneToOne: false
            referencedRelation: "gov_perguntas"
            referencedColumns: ["id"]
          },
        ]
      }
      gov_planos_acao: {
        Row: {
          id: string
          resposta_id: string
          prioridade: string
          o_que_fazer: string
          quem_vai_fazer: string | null
          quem_pediu: string | null
          observacao: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          resposta_id: string
          prioridade?: string
          o_que_fazer: string
          quem_vai_fazer?: string | null
          quem_pediu?: string | null
          observacao?: string | null
          criado_em?: string
        }
        Update: {
          id?: string
          resposta_id?: string
          prioridade?: string
          o_que_fazer?: string
          quem_vai_fazer?: string | null
          quem_pediu?: string | null
          observacao?: string | null
          criado_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "gov_planos_acao_resposta_id_fkey"
            columns: ["resposta_id"]
            isOneToOne: false
            referencedRelation: "gov_respostas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      abrir_preventivas_vencidas: {
        Args: Record<string, never>
        Returns: number
      }
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
      aplicar_experiencia_hospede: {
        Args: { p_token: string; p_afeta?: boolean }
        Returns: undefined
      }
      salvar_push_inscricao: {
        Args: { p_endpoint: string; p_p256dh: string; p_auth: string }
        Returns: undefined
      }
      aplicar_alerta_sentry: {
        Args: {
          p_slug: string
          p_issue_id: string
          p_nivel: string
          p_ambiente: string
          p_descricao: string
          p_rota: string
          p_quadro: string
          p_ocorrencias: number
          p_usuarios: number
          p_primeira?: string | null
          p_ultima?: string | null
          p_sentry_url: string
          p_posthog_url: string
          p_prioridade: Database["public"]["Enums"]["demanda_prioridade"]
          p_afeta: boolean
        }
        Returns: string
      }
      confirmar_finalizacao: {
        Args: { p_token: string }
        Returns: undefined
      }
      contestar_finalizacao: {
        Args: { p_token: string; p_descricao: string; p_foto_url?: string }
        Returns: undefined
      }
      pegar_demanda: {
        Args: { p_demanda_id: string }
        Returns: undefined
      }
      definir_sublocal: {
        Args: { p_token: string; p_sublocal: string }
        Returns: undefined
      }
      definir_sistema_demanda: {
        Args: { p_token: string; p_sistema_id: string | null }
        Returns: undefined
      }
      rotulo_sistema: {
        Args: { p_token: string }
        Returns: string
      }
      vincular_evento_demanda: {
        Args: { p_token: string; p_evento_id: string }
        Returns: undefined
      }
      vincular_projeto_demanda: {
        Args: { p_token: string; p_projeto_id: string }
        Returns: undefined
      }
      listar_projetos_ativos: {
        Args: Record<string, never>
        Returns: { id: string; nome: string; propriedade_id: string | null }[]
      }
      admin_criar_projeto: {
        Args: {
          p_nome: string
          p_descricao?: string | null
          p_propriedade_id?: string | null
          p_membros: string[]
        }
        Returns: string
      }
      admin_definir_membros_projeto: {
        Args: { p_projeto_id: string; p_membros: string[] }
        Returns: undefined
      }
      eh_membro_projeto: {
        Args: { p_projeto_id: string; p_uid: string }
        Returns: boolean
      }
      consultar_equipamento: {
        Args: { p_codigo: string }
        Returns: Json
      }
      registrar_manutencao_equipamento: {
        Args: {
          p_codigo: string
          p_descricao: string
          p_tipo?: string
          p_foto_url?: string
        }
        Returns: string
      }
      apagar_demanda: {
        Args: { p_id: string }
        Returns: undefined
      }
      rotulo_sublocal: { Args: { p_token: string }; Returns: string }
      acompanhar_demanda: { Args: { p_token: string }; Returns: Json }
      listar_mensagens_chamado: { Args: { p_token: string }; Returns: Json }
      enviar_mensagem_chamado: {
        Args: { p_token: string; p_texto: string }
        Returns: undefined
      }
      equipe_enviar_mensagem: {
        Args: { p_demanda_id: string; p_texto: string }
        Returns: undefined
      }
      solicitante_fechar_chamado: {
        Args: { p_token: string; p_resolvido: boolean; p_descricao: string }
        Returns: undefined
      }
      registrar_chamado_concluido: {
        Args: {
          p_solicitante_id: string
          p_titulo: string
          p_sublocal: string
          p_descricao?: string
          p_prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          p_ambiente?: Database["public"]["Enums"]["ambiente_equipe"]
          p_anexos?: Json
          p_observacao?: string
          p_sistema_id?: string
        }
        Returns: {
          demanda_id: string
          token: string
        }[]
      }
      demandas_quadro_tv: { Args: Record<string, never>; Returns: Json }
      solicitar_acesso: {
        Args: {
          p_nome: string
          p_email: string
          p_setor: string
          p_funcao: string
        }
        Returns: undefined
      }
      marcar_ambiente_demanda: {
        Args: {
          p_demanda_id: string
          p_ambiente: Database["public"]["Enums"]["ambiente_equipe"]
        }
        Returns: undefined
      }
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
      admin_emails_equipe: {
        Args: Record<string, never>
        Returns: { id: string; email: string }[]
      }
      admin_concluir_demanda: {
        Args: { p_id: string; p_observacao: string }
        Returns: undefined
      }
      admin_definir_governanca: {
        Args: { p_user_id: string; p_papel: string | null }
        Returns: undefined
      }
      admin_definir_ambientes: {
        Args: { p_user_id: string; p_ambientes: string[] }
        Returns: undefined
      }
      admin_atualizar_usuario: {
        Args: {
          p_user_id: string
          p_nome: string
          p_email: string
          p_ativo: boolean
          p_propriedade_id?: string | null
          p_senha?: string | null
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: undefined
      }
      admin_apagar_usuario: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      metricas: {
        Args: {
          p_inicio: string
          p_fim: string
          p_colaborador_id?: string
          p_setor_id?: string
          p_propriedade_id?: string
          p_local_id?: string
          p_prioridade?: Database["public"]["Enums"]["demanda_prioridade"]
          p_evento_id?: string
          p_somente_eventos?: boolean
          p_status?: Database["public"]["Enums"]["demanda_status"]
          p_arquivado?: boolean
          p_ambiente?: Database["public"]["Enums"]["ambiente_equipe"]
        }
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
      user_role: "admin" | "lider" | "colaborador" | "solicitante"
      ambiente_equipe: "manutencao" | "ti"
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
      user_role: ["admin", "lider", "colaborador", "solicitante"],
      ambiente_equipe: ["manutencao", "ti"],
    },
  },
} as const
