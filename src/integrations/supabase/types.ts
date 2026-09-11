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
      abandoned_carts: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          discount_code: string | null
          id: string
          items: Json
          last_activity_at: string | null
          recovered_at: string | null
          reminder_count: number | null
          reminder_sent_at: string | null
          shipping_info: Json | null
          subtotal: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          discount_code?: string | null
          id?: string
          items: Json
          last_activity_at?: string | null
          recovered_at?: string | null
          reminder_count?: number | null
          reminder_sent_at?: string | null
          shipping_info?: Json | null
          subtotal?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          discount_code?: string | null
          id?: string
          items?: Json
          last_activity_at?: string | null
          recovered_at?: string | null
          reminder_count?: number | null
          reminder_sent_at?: string | null
          shipping_info?: Json | null
          subtotal?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      addresses: {
        Row: {
          city: string
          complement: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string
          neighborhood: string
          number: string
          recipient_name: string
          state: string
          street: string
          updated_at: string | null
          user_id: string
          zip_code: string
        }
        Insert: {
          city: string
          complement?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label: string
          neighborhood: string
          number: string
          recipient_name: string
          state: string
          street: string
          updated_at?: string | null
          user_id: string
          zip_code: string
        }
        Update: {
          city?: string
          complement?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string
          neighborhood?: string
          number?: string
          recipient_name?: string
          state?: string
          street?: string
          updated_at?: string | null
          user_id?: string
          zip_code?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          button_link: string | null
          button_text: string | null
          click_url: string | null
          created_at: string | null
          desktop_object_position: string
          id: string
          image_url: string
          is_active: boolean | null
          media_type: string | null
          mobile_image_url: string | null
          mobile_object_position: string
          overlay_opacity: number | null
          position: number | null
          show_button: boolean | null
          subtitle: string | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          button_link?: string | null
          button_text?: string | null
          click_url?: string | null
          created_at?: string | null
          desktop_object_position?: string
          id?: string
          image_url: string
          is_active?: boolean | null
          media_type?: string | null
          mobile_image_url?: string | null
          mobile_object_position?: string
          overlay_opacity?: number | null
          position?: number | null
          show_button?: boolean | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          button_link?: string | null
          button_text?: string | null
          click_url?: string | null
          created_at?: string | null
          desktop_object_position?: string
          id?: string
          image_url?: string
          is_active?: boolean | null
          media_type?: string | null
          mobile_image_url?: string | null
          mobile_object_position?: string
          overlay_opacity?: number | null
          position?: number | null
          show_button?: boolean | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      bling_config: {
        Row: {
          access_token: string | null
          client_id: string | null
          client_secret: string | null
          company_name: string | null
          created_at: string
          deposito_id: string | null
          deposito_name: string | null
          id: string
          is_active: boolean
          last_error: string | null
          last_order_pull_at: string | null
          last_sync_at: string | null
          loja_id: string | null
          loja_name: string | null
          oauth_state: string | null
          order_pull_interval_minutes: number
          price_authority: string
          pull_marketplace_orders: boolean
          push_orders: boolean
          redirect_origin: string | null
          refresh_token: string | null
          stock_authority: string
          sync_prices: boolean
          sync_products: boolean
          sync_stock: boolean
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          company_name?: string | null
          created_at?: string
          deposito_id?: string | null
          deposito_name?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_order_pull_at?: string | null
          last_sync_at?: string | null
          loja_id?: string | null
          loja_name?: string | null
          oauth_state?: string | null
          order_pull_interval_minutes?: number
          price_authority?: string
          pull_marketplace_orders?: boolean
          push_orders?: boolean
          redirect_origin?: string | null
          refresh_token?: string | null
          stock_authority?: string
          sync_prices?: boolean
          sync_products?: boolean
          sync_stock?: boolean
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          client_id?: string | null
          client_secret?: string | null
          company_name?: string | null
          created_at?: string
          deposito_id?: string | null
          deposito_name?: string | null
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_order_pull_at?: string | null
          last_sync_at?: string | null
          loja_id?: string | null
          loja_name?: string | null
          oauth_state?: string | null
          order_pull_interval_minutes?: number
          price_authority?: string
          pull_marketplace_orders?: boolean
          push_orders?: boolean
          redirect_origin?: string | null
          refresh_token?: string | null
          stock_authority?: string
          sync_prices?: boolean
          sync_products?: boolean
          sync_stock?: boolean
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bling_order_links: {
        Row: {
          bling_order_id: string
          bling_order_number: string | null
          bling_status: string | null
          channel: string | null
          direction: string
          id: string
          imported_at: string
          last_synced_at: string | null
          order_id: string | null
          raw_payload: Json | null
        }
        Insert: {
          bling_order_id: string
          bling_order_number?: string | null
          bling_status?: string | null
          channel?: string | null
          direction?: string
          id?: string
          imported_at?: string
          last_synced_at?: string | null
          order_id?: string | null
          raw_payload?: Json | null
        }
        Update: {
          bling_order_id?: string
          bling_order_number?: string | null
          bling_status?: string | null
          channel?: string | null
          direction?: string
          id?: string
          imported_at?: string
          last_synced_at?: string | null
          order_id?: string | null
          raw_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "bling_order_links_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      bling_product_links: {
        Row: {
          bling_product_id: string | null
          bling_sku: string | null
          created_at: string
          id: string
          last_error: string | null
          last_pulled_at: string | null
          last_pushed_at: string | null
          product_id: string
          status: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          bling_product_id?: string | null
          bling_sku?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_pulled_at?: string | null
          last_pushed_at?: string | null
          product_id: string
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          bling_product_id?: string | null
          bling_sku?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          last_pulled_at?: string | null
          last_pushed_at?: string | null
          product_id?: string
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bling_product_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bling_product_links_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      bling_sync_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          payload: Json | null
          response: Json | null
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          response?: Json | null
          status: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          response?: Json | null
          status?: string
        }
        Relationships: []
      }
      bling_sync_queue: {
        Row: {
          action: string
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          order_id: string | null
          payload: Json | null
          processed_at: string | null
          product_id: string | null
          scheduled_for: string
          status: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          action: string
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          order_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          product_id?: string | null
          scheduled_for?: string
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          action?: string
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          order_id?: string | null
          payload?: Json | null
          processed_at?: string | null
          product_id?: string | null
          scheduled_for?: string
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bling_sync_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bling_sync_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bling_sync_queue_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          register_id: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          register_id: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          register_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_register_id_fkey"
            columns: ["register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closing_amount: number | null
          created_at: string | null
          difference: number | null
          expected_amount: number | null
          id: string
          next_day_opening_amount: number | null
          notes: string | null
          opened_at: string
          opened_by: string
          opening_amount: number
          status: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          created_at?: string | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          next_day_opening_amount?: number | null
          notes?: string | null
          opened_at?: string
          opened_by: string
          opening_amount?: number
          status?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closing_amount?: number | null
          created_at?: string | null
          difference?: number | null
          expected_amount?: number | null
          id?: string
          next_day_opening_amount?: number | null
          notes?: string | null
          opened_at?: string
          opened_by?: string
          opening_amount?: number
          status?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_media: {
        Row: {
          alt_text: string | null
          created_at: string | null
          file_name: string
          file_size: number | null
          id: string
          type: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          type?: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          type?: string
          url?: string
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          created_at: string | null
          id: string
          is_home: boolean | null
          is_published: boolean | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_home?: boolean | null
          is_published?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_home?: boolean | null
          is_published?: boolean | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cms_sections: {
        Row: {
          content: Json
          created_at: string | null
          id: string
          is_visible: boolean | null
          page_id: string
          position: number
          settings: Json
          type: string
          updated_at: string | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          page_id: string
          position?: number
          settings?: Json
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          id?: string
          is_visible?: boolean | null
          page_id?: string
          position?: number
          settings?: Json
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_sections_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "cms_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_theme: {
        Row: {
          colors: Json
          created_at: string | null
          favicon_url: string | null
          fonts: Json
          id: string
          is_active: boolean | null
          logo_dark_url: string | null
          logo_url: string | null
          name: string
          seo: Json | null
          social: Json | null
          texts: Json | null
          updated_at: string | null
        }
        Insert: {
          colors?: Json
          created_at?: string | null
          favicon_url?: string | null
          fonts?: Json
          id?: string
          is_active?: boolean | null
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string
          seo?: Json | null
          social?: Json | null
          texts?: Json | null
          updated_at?: string | null
        }
        Update: {
          colors?: Json
          created_at?: string | null
          favicon_url?: string | null
          fonts?: Json
          id?: string
          is_active?: boolean | null
          logo_dark_url?: string | null
          logo_url?: string | null
          name?: string
          seo?: Json | null
          social?: Json | null
          texts?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      consignment_items: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string
          quantity_received: number
          quantity_returned: number
          quantity_sold: number
          received_at: string | null
          supplier_id: string
          unit_cost: number
          updated_at: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity_received?: number
          quantity_returned?: number
          quantity_sold?: number
          received_at?: string | null
          supplier_id: string
          unit_cost?: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity_received?: number
          quantity_returned?: number
          quantity_sold?: number
          received_at?: string | null
          supplier_id?: string
          unit_cost?: number
          updated_at?: string | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consignment_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consignment_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_coupons: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          discount_id: string
          expires_at: string | null
          id: string
          is_used: boolean | null
          note: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          discount_id: string
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          note?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          discount_id?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          note?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_coupons_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_discount: number | null
          max_uses: number | null
          min_order_value: number | null
          starts_at: string | null
          type: string
          updated_at: string | null
          uses_count: number | null
          uses_per_user: number | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          min_order_value?: number | null
          starts_at?: string | null
          type: string
          updated_at?: string | null
          uses_count?: number | null
          uses_per_user?: number | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          min_order_value?: number | null
          starts_at?: string | null
          type?: string
          updated_at?: string | null
          uses_count?: number | null
          uses_per_user?: number | null
          value?: number
        }
        Relationships: []
      }
      discount_usage: {
        Row: {
          discount_id: string
          id: string
          order_id: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          discount_id: string
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          discount_id?: string
          id?: string
          order_id?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_usage_discount_id_fkey"
            columns: ["discount_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_usage_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          blocks: Json
          created_at: string
          created_by: string | null
          id: string
          last_sent_at: string | null
          name: string
          preheader: string | null
          settings: Json
          subject: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          last_sent_at?: string | null
          name: string
          preheader?: string | null
          settings?: Json
          subject?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          last_sent_at?: string | null
          name?: string
          preheader?: string | null
          settings?: Json
          subject?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string | null
          description: string
          due_date: string
          id: string
          is_recurring: boolean | null
          notes: string | null
          paid_at: string | null
          recurrence_type: string | null
          supplier: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string | null
          description: string
          due_date: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          paid_at?: string | null
          recurrence_type?: string | null
          supplier?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string | null
          description?: string
          due_date?: string
          id?: string
          is_recurring?: boolean | null
          notes?: string | null
          paid_at?: string | null
          recurrence_type?: string | null
          supplier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string | null
          currency_code: string | null
          id: string
          product_handle: string
          product_id: string | null
          product_image: string | null
          product_price: number | null
          product_title: string
          shopify_product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency_code?: string | null
          id?: string
          product_handle: string
          product_id?: string | null
          product_image?: string | null
          product_price?: number | null
          product_title: string
          shopify_product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency_code?: string | null
          id?: string
          product_handle?: string
          product_id?: string | null
          product_image?: string | null
          product_price?: number | null
          product_title?: string
          shopify_product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date: string
          type: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          type?: string
        }
        Relationships: []
      }
      inbound_events: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          source: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          source?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      inbound_items: {
        Row: {
          ai_confidence: number | null
          ai_data: Json | null
          ai_source: string | null
          attributes: Json
          barcode: string | null
          brand: string | null
          category: string | null
          condition_code: string
          cost: number | null
          created_at: string
          created_by: string | null
          id: string
          lot_id: string | null
          notes: string | null
          operator_code: string | null
          photo_path: string | null
          product_id: string | null
          quantity: number
          receipt_id: string | null
          sku: string | null
          state: string
          suggested_price: number | null
          title: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          ai_confidence?: number | null
          ai_data?: Json | null
          ai_source?: string | null
          attributes?: Json
          barcode?: string | null
          brand?: string | null
          category?: string | null
          condition_code?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          lot_id?: string | null
          notes?: string | null
          operator_code?: string | null
          photo_path?: string | null
          product_id?: string | null
          quantity?: number
          receipt_id?: string | null
          sku?: string | null
          state?: string
          suggested_price?: number | null
          title?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          ai_confidence?: number | null
          ai_data?: Json | null
          ai_source?: string | null
          attributes?: Json
          barcode?: string | null
          brand?: string | null
          category?: string | null
          condition_code?: string
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          lot_id?: string | null
          notes?: string | null
          operator_code?: string | null
          photo_path?: string | null
          product_id?: string | null
          quantity?: number
          receipt_id?: string | null
          sku?: string | null
          state?: string
          suggested_price?: number | null
          title?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inbound_items_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_items_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "truck_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inbound_pendings: {
        Row: {
          ai_suggestions: Json | null
          created_at: string
          created_by: string | null
          id: string
          item_id: string | null
          lot_id: string | null
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_suggestions?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          lot_id?: string | null
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_suggestions?: Json | null
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          lot_id?: string | null
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inbound_pendings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inbound_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inbound_pendings_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_closing_items: {
        Row: {
          closing_id: string
          created_at: string
          id: string
          product_id: string
          product_title: string
          quantity: number
          sku: string | null
          total_cost: number
          total_retail: number
          unit_cost: number
          unit_price: number
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          closing_id: string
          created_at?: string
          id?: string
          product_id: string
          product_title: string
          quantity?: number
          sku?: string | null
          total_cost?: number
          total_retail?: number
          unit_cost?: number
          unit_price?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          closing_id?: string
          created_at?: string
          id?: string
          product_id?: string
          product_title?: string
          quantity?: number
          sku?: string | null
          total_cost?: number
          total_retail?: number
          unit_cost?: number
          unit_price?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_closing_items_closing_id_fkey"
            columns: ["closing_id"]
            isOneToOne: false
            referencedRelation: "inventory_closings"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_closings: {
        Row: {
          closed_at: string
          closed_by: string
          created_at: string
          id: string
          month: number
          notes: string | null
          store_id: string | null
          total_cost_value: number
          total_retail_value: number
          total_units: number
          year: number
        }
        Insert: {
          closed_at?: string
          closed_by: string
          created_at?: string
          id?: string
          month: number
          notes?: string | null
          store_id?: string | null
          total_cost_value?: number
          total_retail_value?: number
          total_units?: number
          year: number
        }
        Update: {
          closed_at?: string
          closed_by?: string
          created_at?: string
          id?: string
          month?: number
          notes?: string | null
          store_id?: string | null
          total_cost_value?: number
          total_retail_value?: number
          total_units?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_closings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      lots: {
        Row: {
          closed_at: string | null
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          expected_units: number
          id: string
          notes: string | null
          opened_at: string
          processed_units: number
          receipt_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_units?: number
          id?: string
          notes?: string | null
          opened_at?: string
          processed_units?: number
          receipt_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expected_units?: number
          id?: string
          notes?: string | null
          opened_at?: string
          processed_units?: number
          receipt_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lots_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "truck_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_points: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          last_activity_at: string | null
          total_earned: number
          total_redeemed: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          total_earned?: number
          total_redeemed?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          total_earned?: number
          total_redeemed?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      loyalty_settings: {
        Row: {
          created_at: string | null
          earn_on_shipping: boolean
          exclude_promo_items: boolean
          expiration_enabled: boolean
          expiration_months: number
          first_purchase_bonus: number
          id: string
          is_active: boolean
          max_discount_percent: number
          min_order_value: number
          min_redemption: number
          points_per_real: number
          redemption_rate: number
          redemption_step: number
          tier_bronze_min: number
          tier_bronze_multiplier: number
          tier_gold_min: number
          tier_gold_multiplier: number
          tier_silver_min: number
          tier_silver_multiplier: number
          tiers_enabled: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          earn_on_shipping?: boolean
          exclude_promo_items?: boolean
          expiration_enabled?: boolean
          expiration_months?: number
          first_purchase_bonus?: number
          id?: string
          is_active?: boolean
          max_discount_percent?: number
          min_order_value?: number
          min_redemption?: number
          points_per_real?: number
          redemption_rate?: number
          redemption_step?: number
          tier_bronze_min?: number
          tier_bronze_multiplier?: number
          tier_gold_min?: number
          tier_gold_multiplier?: number
          tier_silver_min?: number
          tier_silver_multiplier?: number
          tiers_enabled?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          earn_on_shipping?: boolean
          exclude_promo_items?: boolean
          expiration_enabled?: boolean
          expiration_months?: number
          first_purchase_bonus?: number
          id?: string
          is_active?: boolean
          max_discount_percent?: number
          min_order_value?: number
          min_redemption?: number
          points_per_real?: number
          redemption_rate?: number
          redemption_step?: number
          tier_bronze_min?: number
          tier_bronze_multiplier?: number
          tier_gold_min?: number
          tier_gold_multiplier?: number
          tier_silver_min?: number
          tier_silver_multiplier?: number
          tiers_enabled?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          order_id: string | null
          points: number
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          points: number
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          order_id?: string | null
          points?: number
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          id: string
          last_error: string | null
          order_id: string | null
          scheduled_for: string
          sent_at: string | null
          status: string
          step_index: number
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          order_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          step_index?: number
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          id?: string
          last_error?: string | null
          order_id?: string | null
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          step_index?: number
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      operator_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          operator_id: string
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          operator_id: string
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          operator_id?: string
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_sessions_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operators: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          name: string
          pin_hash: string
          role: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name: string
          pin_hash: string
          role?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          name?: string
          pin_hash?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          order_id: string
          product_id: string | null
          product_title: string
          quantity: number
          shopify_product_id: string
          shopify_variant_id: string
          total_price: number
          unit_price: number
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          order_id: string
          product_id?: string | null
          product_title: string
          quantity: number
          shopify_product_id: string
          shopify_variant_id: string
          total_price: number
          unit_price: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          order_id?: string
          product_id?: string | null
          product_title?: string
          quantity?: number
          shopify_product_id?: string
          shopify_variant_id?: string
          total_price?: number
          unit_price?: number
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          discount_amount: number | null
          discount_code: string | null
          guest_info: Json | null
          id: string
          last_payment_error: string | null
          loyalty_credited: boolean | null
          loyalty_points_used: number | null
          order_number: string
          paid_at: string | null
          payment_attempts: number | null
          payment_method: string | null
          payment_receipt_url: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_cost: number | null
          shopify_checkout_id: string | null
          source: string | null
          status: string
          store_id: string | null
          subtotal: number
          total: number
          tracking_code: string | null
          tracking_url: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          discount_code?: string | null
          guest_info?: Json | null
          id?: string
          last_payment_error?: string | null
          loyalty_credited?: boolean | null
          loyalty_points_used?: number | null
          order_number: string
          paid_at?: string | null
          payment_attempts?: number | null
          payment_method?: string | null
          payment_receipt_url?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          shopify_checkout_id?: string | null
          source?: string | null
          status?: string
          store_id?: string | null
          subtotal: number
          total: number
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          discount_code?: string | null
          guest_info?: Json | null
          id?: string
          last_payment_error?: string | null
          loyalty_credited?: boolean | null
          loyalty_points_used?: number | null
          order_number?: string
          paid_at?: string | null
          payment_attempts?: number | null
          payment_method?: string | null
          payment_receipt_url?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_cost?: number | null
          shopify_checkout_id?: string | null
          source?: string | null
          status?: string
          store_id?: string | null
          subtotal?: number
          total?: number
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          browser: string | null
          created_at: string | null
          device_type: string | null
          id: string
          page_path: string
          page_title: string | null
          referrer: string | null
          session_id: string
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          page_path: string
          page_title?: string | null
          referrer?: string | null
          session_id: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          browser?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          page_path?: string
          page_title?: string | null
          referrer?: string | null
          session_id?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          created_at: string | null
          expiry_alert_days: number
          has_sizes: boolean | null
          id: string
          label: string
          position: number | null
          size_type: string | null
          tracks_expiry: boolean
          value: string
        }
        Insert: {
          created_at?: string | null
          expiry_alert_days?: number
          has_sizes?: boolean | null
          id?: string
          label: string
          position?: number | null
          size_type?: string | null
          tracks_expiry?: boolean
          value: string
        }
        Update: {
          created_at?: string | null
          expiry_alert_days?: number
          has_sizes?: boolean | null
          id?: string
          label?: string
          position?: number | null
          size_type?: string | null
          tracks_expiry?: boolean
          value?: string
        }
        Relationships: []
      }
      product_colors: {
        Row: {
          created_at: string | null
          hex: string
          id: string
          name: string
          position: number | null
        }
        Insert: {
          created_at?: string | null
          hex: string
          id?: string
          name: string
          position?: number | null
        }
        Update: {
          created_at?: string | null
          hex?: string
          id?: string
          name?: string
          position?: number | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          position: number
          product_id: string
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id: string
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_kit_items: {
        Row: {
          created_at: string | null
          id: string
          kit_id: string
          product_id: string
          quantity: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kit_id: string
          product_id: string
          quantity?: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kit_id?: string
          product_id?: string
          quantity?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_kit_items_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "product_kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_kit_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_kit_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_kits: {
        Row: {
          created_at: string | null
          description: string | null
          discount_percent: number | null
          ends_at: string | null
          fixed_price: number | null
          gallery_urls: Json
          handle: string
          id: string
          image_url: string | null
          is_available: boolean
          position: number | null
          pricing_type: string
          starts_at: string | null
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          ends_at?: string | null
          fixed_price?: number | null
          gallery_urls?: Json
          handle: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          position?: number | null
          pricing_type?: string
          starts_at?: string | null
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          discount_percent?: number | null
          ends_at?: string | null
          fixed_price?: number | null
          gallery_urls?: Json
          handle?: string
          id?: string
          image_url?: string | null
          is_available?: boolean
          position?: number | null
          pricing_type?: string
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_labels: {
        Row: {
          barcode_value: string
          created_at: string | null
          id: string
          label_number: number
          linked_at: string | null
          order_id: string | null
          price: number | null
          printed_at: string | null
          product_id: string
          product_title: string
          sku: string | null
          status: string
          variant_id: string | null
          variant_title: string | null
        }
        Insert: {
          barcode_value: string
          created_at?: string | null
          id?: string
          label_number: number
          linked_at?: string | null
          order_id?: string | null
          price?: number | null
          printed_at?: string | null
          product_id: string
          product_title: string
          sku?: string | null
          status?: string
          variant_id?: string | null
          variant_title?: string | null
        }
        Update: {
          barcode_value?: string
          created_at?: string | null
          id?: string
          label_number?: number
          linked_at?: string | null
          order_id?: string | null
          price?: number | null
          printed_at?: string | null
          product_id?: string
          product_title?: string
          sku?: string | null
          status?: string
          variant_id?: string | null
          variant_title?: string | null
        }
        Relationships: []
      }
      product_options: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          product_id: string
          values: string[]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          product_id: string
          values?: string[]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          product_id?: string
          values?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "product_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          compare_at_price: number | null
          cost: number | null
          created_at: string
          expiry_date: string | null
          id: string
          inventory_policy: string
          inventory_quantity: number
          is_available: boolean
          option1: string | null
          option2: string | null
          option3: string | null
          price: number
          product_id: string
          sku: string | null
          title: string
          updated_at: string
          volume_ml: number | null
        }
        Insert: {
          compare_at_price?: number | null
          cost?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          inventory_policy?: string
          inventory_quantity?: number
          is_available?: boolean
          option1?: string | null
          option2?: string | null
          option3?: string | null
          price?: number
          product_id: string
          sku?: string | null
          title?: string
          updated_at?: string
          volume_ml?: number | null
        }
        Update: {
          compare_at_price?: number | null
          cost?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          inventory_policy?: string
          inventory_quantity?: number
          is_available?: boolean
          option1?: string | null
          option2?: string | null
          option3?: string | null
          price?: number
          product_id?: string
          sku?: string | null
          title?: string
          updated_at?: string
          volume_ml?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          compare_at_price: number | null
          created_at: string
          description: string | null
          expiry_date: string | null
          handle: string
          height_cm: number | null
          id: string
          is_available: boolean
          is_consignment: boolean | null
          is_lote: boolean
          length_cm: number | null
          position: number | null
          price: number
          product_type: string | null
          status: string
          supplier_id: string | null
          title: string
          updated_at: string
          vendor: string | null
          weight_grams: number | null
          width_cm: number | null
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          handle: string
          height_cm?: number | null
          id?: string
          is_available?: boolean
          is_consignment?: boolean | null
          is_lote?: boolean
          length_cm?: number | null
          position?: number | null
          price?: number
          product_type?: string | null
          status?: string
          supplier_id?: string | null
          title: string
          updated_at?: string
          vendor?: string | null
          weight_grams?: number | null
          width_cm?: number | null
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          handle?: string
          height_cm?: number | null
          id?: string
          is_available?: boolean
          is_consignment?: boolean | null
          is_lote?: boolean
          length_cm?: number | null
          position?: number | null
          price?: number
          product_type?: string | null
          status?: string
          supplier_id?: string | null
          title?: string
          updated_at?: string
          vendor?: string | null
          weight_grams?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_date: string | null
          cpf: string | null
          created_at: string
          full_name: string | null
          id: string
          last_winback_at: string | null
          phone: string | null
          updated_at: string
          welcomed_at: string | null
        }
        Insert: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          last_winback_at?: string | null
          phone?: string | null
          updated_at?: string
          welcomed_at?: string | null
        }
        Update: {
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          last_winback_at?: string | null
          phone?: string | null
          updated_at?: string
          welcomed_at?: string | null
        }
        Relationships: []
      }
      promo_pages: {
        Row: {
          banner_images: Json | null
          created_at: string | null
          hero_image: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          is_published: boolean | null
          product_ids: Json | null
          promotion_id: string | null
          show_hero_text: boolean | null
          slug: string
          title: string
          updated_at: string | null
        }
        Insert: {
          banner_images?: Json | null
          created_at?: string | null
          hero_image?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_published?: boolean | null
          product_ids?: Json | null
          promotion_id?: string | null
          show_hero_text?: boolean | null
          slug: string
          title: string
          updated_at?: string | null
        }
        Update: {
          banner_images?: Json | null
          created_at?: string | null
          hero_image?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          is_published?: boolean | null
          product_ids?: Json | null
          promotion_id?: string | null
          show_hero_text?: boolean | null
          slug?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_pages_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotion_products: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          promotion_id: string
          promotional_price: number | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          promotion_id: string
          promotional_price?: number | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          promotion_id?: string
          promotional_price?: number | null
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promotion_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_products_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          config: Json | null
          created_at: string | null
          ends_at: string
          id: string
          starts_at: string
          status: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          ends_at: string
          id?: string
          starts_at: string
          status?: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          ends_at?: string
          id?: string
          starts_at?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      receipt_attachments: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string | null
          file_path: string
          id: string
          kind: string
          lot_id: string | null
          mime_type: string | null
          receipt_id: string | null
          size_bytes: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_path: string
          id?: string
          kind?: string
          lot_id?: string | null
          mime_type?: string | null
          receipt_id?: string | null
          size_bytes?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          file_path?: string
          id?: string
          kind?: string
          lot_id?: string | null
          mime_type?: string | null
          receipt_id?: string | null
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receipt_attachments_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipt_attachments_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "truck_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          id: string
          order_id: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          id?: string
          order_id: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          order_id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          admin_reply: string | null
          comment: string
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string
          rating: number
          status: string
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          comment: string
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id: string
          rating: number
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          comment?: string
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string
          rating?: number
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          cost: number
          created_at: string | null
          dropship_extra_days: number | null
          estimated_days: string
          id: string
          region: string
          state_code: string
          state_name: string
          updated_at: string | null
        }
        Insert: {
          cost: number
          created_at?: string | null
          dropship_extra_days?: number | null
          estimated_days: string
          id?: string
          region: string
          state_code: string
          state_name: string
          updated_at?: string | null
        }
        Update: {
          cost?: number
          created_at?: string | null
          dropship_extra_days?: number | null
          estimated_days?: string
          id?: string
          region?: string
          state_code?: string
          state_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shopify_config: {
        Row: {
          auto_sync: boolean
          created_at: string
          default_location_id: string | null
          id: string
          is_enabled: boolean
          last_error: string | null
          last_full_sync_at: string | null
          primary_source: string
          store_domain: string | null
          sync_direction: string
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          auto_sync?: boolean
          created_at?: string
          default_location_id?: string | null
          id?: string
          is_enabled?: boolean
          last_error?: string | null
          last_full_sync_at?: string | null
          primary_source?: string
          store_domain?: string | null
          sync_direction?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          auto_sync?: boolean
          created_at?: string
          default_location_id?: string | null
          id?: string
          is_enabled?: boolean
          last_error?: string | null
          last_full_sync_at?: string | null
          primary_source?: string
          store_domain?: string | null
          sync_direction?: string
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      shopify_product_links: {
        Row: {
          created_at: string
          id: string
          last_error: string | null
          last_pushed_hash: string | null
          last_synced_at: string | null
          product_id: string
          shopify_inventory_item_id: string | null
          shopify_product_id: string | null
          shopify_variant_id: string | null
          sync_status: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          last_error?: string | null
          last_pushed_hash?: string | null
          last_synced_at?: string | null
          product_id: string
          shopify_inventory_item_id?: string | null
          shopify_product_id?: string | null
          shopify_variant_id?: string | null
          sync_status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_error?: string | null
          last_pushed_hash?: string | null
          last_synced_at?: string | null
          product_id?: string
          shopify_inventory_item_id?: string | null
          shopify_product_id?: string | null
          shopify_variant_id?: string | null
          sync_status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_product_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_product_links_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_sync_queue: {
        Row: {
          action: string
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          payload: Json | null
          processed_at: string | null
          product_id: string | null
          scheduled_at: string
          shopify_product_id: string | null
          status: string
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          action: string
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json | null
          processed_at?: string | null
          product_id?: string | null
          scheduled_at?: string
          shopify_product_id?: string | null
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          action?: string
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          payload?: Json | null
          processed_at?: string | null
          product_id?: string | null
          scheduled_at?: string
          shopify_product_id?: string | null
          status?: string
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_sync_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_sync_queue_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      store_employees: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          role: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          role?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          role?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_employees_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_inventory: {
        Row: {
          id: string
          product_id: string
          quantity: number
          store_id: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          store_id: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          city: string | null
          complement: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          neighborhood: string | null
          number: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          complement?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          complement?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: []
      }
      supplier_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          reference_period: string | null
          supplier_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_period?: string | null
          supplier_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          reference_period?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          contact_name: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contact_name?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tiktok_category_map: {
        Row: {
          created_at: string
          id: string
          local_category_id: string
          tiktok_category_id: string
          tiktok_category_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          local_category_id: string
          tiktok_category_id: string
          tiktok_category_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          local_category_id?: string
          tiktok_category_id?: string
          tiktok_category_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tiktok_order_links: {
        Row: {
          id: string
          imported_at: string
          last_synced_at: string | null
          order_id: string | null
          raw_payload: Json | null
          tiktok_order_id: string
          tiktok_status: string | null
        }
        Insert: {
          id?: string
          imported_at?: string
          last_synced_at?: string | null
          order_id?: string | null
          raw_payload?: Json | null
          tiktok_order_id: string
          tiktok_status?: string | null
        }
        Update: {
          id?: string
          imported_at?: string
          last_synced_at?: string | null
          order_id?: string | null
          raw_payload?: Json | null
          tiktok_order_id?: string
          tiktok_status?: string | null
        }
        Relationships: []
      }
      tiktok_product_links: {
        Row: {
          attributes: Json
          created_at: string
          id: string
          image_cache: Json
          last_error: string | null
          last_pushed_at: string | null
          product_id: string
          status: string
          tiktok_product_id: string | null
          tiktok_sku_id: string | null
          tiktok_status: string | null
          updated_at: string
          variant_id: string | null
        }
        Insert: {
          attributes?: Json
          created_at?: string
          id?: string
          image_cache?: Json
          last_error?: string | null
          last_pushed_at?: string | null
          product_id: string
          status?: string
          tiktok_product_id?: string | null
          tiktok_sku_id?: string | null
          tiktok_status?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Update: {
          attributes?: Json
          created_at?: string
          id?: string
          image_cache?: Json
          last_error?: string | null
          last_pushed_at?: string | null
          product_id?: string
          status?: string
          tiktok_product_id?: string | null
          tiktok_sku_id?: string | null
          tiktok_status?: string | null
          updated_at?: string
          variant_id?: string | null
        }
        Relationships: []
      }
      tiktok_product_queue: {
        Row: {
          action: string
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          processed_at: string | null
          product_id: string
          scheduled_for: string
          status: string
          updated_at: string
        }
        Insert: {
          action?: string
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          processed_at?: string | null
          product_id: string
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Update: {
          action?: string
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          processed_at?: string | null
          product_id?: string
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_product_queue_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_shop_config: {
        Row: {
          access_token: string | null
          app_key: string | null
          app_secret: string | null
          auto_sync_orders: boolean
          auto_sync_products: boolean
          created_at: string
          id: string
          is_active: boolean
          last_order_pull_at: string | null
          last_sync_at: string | null
          oauth_state: string | null
          refresh_expires_at: string | null
          refresh_token: string | null
          region: string | null
          shop_cipher: string | null
          shop_id: string | null
          shop_name: string | null
          token_expires_at: string | null
          updated_at: string
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Insert: {
          access_token?: string | null
          app_key?: string | null
          app_secret?: string | null
          auto_sync_orders?: boolean
          auto_sync_products?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          last_order_pull_at?: string | null
          last_sync_at?: string | null
          oauth_state?: string | null
          refresh_expires_at?: string | null
          refresh_token?: string | null
          region?: string | null
          shop_cipher?: string | null
          shop_id?: string | null
          shop_name?: string | null
          token_expires_at?: string | null
          updated_at?: string
          warehouse_id?: string | null
          warehouse_name?: string | null
        }
        Update: {
          access_token?: string | null
          app_key?: string | null
          app_secret?: string | null
          auto_sync_orders?: boolean
          auto_sync_products?: boolean
          created_at?: string
          id?: string
          is_active?: boolean
          last_order_pull_at?: string | null
          last_sync_at?: string | null
          oauth_state?: string | null
          refresh_expires_at?: string | null
          refresh_token?: string | null
          region?: string | null
          shop_cipher?: string | null
          shop_id?: string | null
          shop_name?: string | null
          token_expires_at?: string | null
          updated_at?: string
          warehouse_id?: string | null
          warehouse_name?: string | null
        }
        Relationships: []
      }
      tiktok_stock_queue: {
        Row: {
          attempts: number
          created_at: string
          error_message: string | null
          id: string
          processed_at: string | null
          variant_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          variant_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          variant_id?: string
        }
        Relationships: []
      }
      tiktok_sync_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          error_message: string | null
          id: string
          payload: Json | null
          response: Json | null
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          response?: Json | null
          status: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          error_message?: string | null
          id?: string
          payload?: Json | null
          response?: Json | null
          status?: string
        }
        Relationships: []
      }
      truck_receipts: {
        Row: {
          carrier: string | null
          code: string
          created_at: string
          created_by: string | null
          document_number: string | null
          driver_name: string | null
          estimated_quantity: number
          id: string
          invoice_number: string | null
          lot_value: number
          notes: string | null
          origin_name: string | null
          received_date: string
          received_time: string
          status: string
          supplier_id: string | null
          truck_plate: string | null
          updated_at: string
        }
        Insert: {
          carrier?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          driver_name?: string | null
          estimated_quantity?: number
          id?: string
          invoice_number?: string | null
          lot_value?: number
          notes?: string | null
          origin_name?: string | null
          received_date?: string
          received_time?: string
          status?: string
          supplier_id?: string | null
          truck_plate?: string | null
          updated_at?: string
        }
        Update: {
          carrier?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          document_number?: string | null
          driver_name?: string | null
          estimated_quantity?: number
          id?: string
          invoice_number?: string | null
          lot_value?: number
          notes?: string | null
          origin_name?: string | null
          received_date?: string
          received_time?: string
          status?: string
          supplier_id?: string | null
          truck_plate?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          browser: string | null
          device_type: string | null
          id: string
          landing_page: string | null
          last_activity_at: string | null
          pages_viewed: number | null
          referrer: string | null
          session_id: string
          started_at: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          browser?: string | null
          device_type?: string | null
          id?: string
          landing_page?: string | null
          last_activity_at?: string | null
          pages_viewed?: number | null
          referrer?: string | null
          session_id: string
          started_at?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          browser?: string | null
          device_type?: string | null
          id?: string
          landing_page?: string | null
          last_activity_at?: string | null
          pages_viewed?: number | null
          referrer?: string | null
          session_id?: string
          started_at?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_commerce_inbound: { Args: { _user_id: string }; Returns: boolean }
      can_consignor_access_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      can_manage_inbound: { Args: { _user_id: string }; Returns: boolean }
      can_qc_inbound: { Args: { _user_id: string }; Returns: boolean }
      can_seller_access_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      can_stock_inbound: { Args: { _user_id: string }; Returns: boolean }
      can_user_access_order: {
        Args: { _order_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_inbound: { Args: { _user_id: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_order_number: { Args: never; Returns: string }
      get_consignor_supplier_id: { Args: { _user_id: string }; Returns: string }
      get_managed_store_ids: { Args: { _user_id: string }; Returns: string[] }
      get_order_by_number: {
        Args: { _order_number: string }
        Returns: {
          created_at: string
          delivered_at: string
          order_number: string
          shipped_at: string
          status: string
          tracking_code: string
          tracking_url: string
        }[]
      }
      has_any_role: {
        Args: { _roles: string[]; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_lot_processed_units: {
        Args: { target_lot_id: string; units_to_add: number }
        Returns: undefined
      }
      is_cd_manager: { Args: { _user_id: string }; Returns: boolean }
      is_store_manager: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_lot_code: { Args: never; Returns: string }
      next_receipt_code: { Args: never; Returns: string }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      shopify_is_enabled: { Args: never; Returns: boolean }
      validate_discount_code: {
        Args: { p_code: string }
        Returns: {
          code: string
          expires_at: string
          id: string
          is_active: boolean
          max_discount: number
          max_uses: number
          min_order_value: number
          starts_at: string
          type: string
          uses_count: number
          uses_per_user: number
          value: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "vendedor"
        | "consignador"
        | "gestor_cd"
        | "inbound"
        | "qc"
        | "estoque"
        | "commerce"
        | "viewer"
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
    Enums: {
      app_role: [
        "admin",
        "user",
        "vendedor",
        "consignador",
        "gestor_cd",
        "inbound",
        "qc",
        "estoque",
        "commerce",
        "viewer",
      ],
    },
  },
} as const
