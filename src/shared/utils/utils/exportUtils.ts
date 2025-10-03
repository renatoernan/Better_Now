export interface ExportColumn {
  key: string;
  label: string;
  format?: (value: any) => string;
}

export interface ExportOptions {
  filename?: string;
  columns?: ExportColumn[];
  includeHeaders?: boolean;
}

/**
 * Converte dados para formato CSV
 */
export function convertToCSV(data: any[], columns: ExportColumn[]): string {
  const headers = columns.map(col => col.label);
  const csvContent = [headers];

  data.forEach(item => {
    const row = columns.map(col => {
      const value = item[col.key];
      const formattedValue = col.format ? col.format(value) : value;
      
      // Escapar aspas duplas e envolver em aspas se necessário
      if (typeof formattedValue === 'string' && (formattedValue.includes(',') || formattedValue.includes('"') || formattedValue.includes('\n'))) {
        return `"${formattedValue.replace(/"/g, '""')}"`;
      }
      
      return formattedValue || '';
    });
    csvContent.push(row);
  });

  return csvContent.map(row => row.join(',')).join('\n');
}

/**
 * Faz download de arquivo CSV
 */
export function downloadCSV(csvContent: string, filename: string = 'export.csv'): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Exporta dados de clientes para CSV
 */
export function exportClientsToCSV(clients: any[], options: ExportOptions = {}): void {
  const defaultColumns: ExportColumn[] = [
    { key: 'name', label: 'Nome' },
    { key: 'phone', label: 'Telefone' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Endereço' },
    { key: 'notes', label: 'Observações' },
    { 
      key: 'created_at', 
      label: 'Data de Cadastro',
      format: (date) => date ? new Date(date).toLocaleDateString('pt-BR') : ''
    },
    { 
      key: 'updated_at', 
      label: 'Última Atualização',
      format: (date) => date ? new Date(date).toLocaleDateString('pt-BR') : ''
    }
  ];

  const columns = options.columns || defaultColumns;
  const filename = options.filename || `clientes_${new Date().toISOString().split('T')[0]}.csv`;
  
  const csvContent = convertToCSV(clients, columns);
  downloadCSV(csvContent, filename);
}

/**
 * Exporta histórico de interações para CSV
 */
export function exportInteractionsToCSV(interactions: any[], clientName?: string, options: ExportOptions = {}): void {
  const defaultColumns: ExportColumn[] = [
    { key: 'client_name', label: 'Cliente' },
    { key: 'type', label: 'Tipo' },
    { key: 'description', label: 'Descrição' },
    { 
      key: 'date', 
      label: 'Data',
      format: (date) => date ? new Date(date).toLocaleDateString('pt-BR') : ''
    },
    { key: 'created_by', label: 'Criado por' }
  ];

  const columns = options.columns || defaultColumns;
  const baseFilename = clientName ? `interacoes_${clientName}` : 'interacoes';
  const filename = options.filename || `${baseFilename}_${new Date().toISOString().split('T')[0]}.csv`;
  
  const csvContent = convertToCSV(interactions, columns);
  downloadCSV(csvContent, filename);
}

/**
 * Formata dados para exportação incluindo estatísticas
 */
export function prepareClientsForExport(clients: any[], includeStats: boolean = false) {
  if (!includeStats) {
    return clients;
  }

  return clients.map(client => ({
    ...client,
    total_interactions: client.interactions?.length || 0,
    last_interaction: client.interactions?.[0]?.date 
      ? new Date(client.interactions[0].date).toLocaleDateString('pt-BR')
      : 'Nenhuma'
  }));
}

/**
 * Gera relatório resumido em CSV
 */
export function exportClientsSummaryToCSV(clients: any[], options: ExportOptions = {}): void {
  const summaryData = [
    { metric: 'Total de Clientes', value: clients.length },
    { metric: 'Clientes com Email', value: clients.filter(c => c.email).length },
    { metric: 'Clientes com WhatsApp', value: clients.filter(c => c.whatsapp).length },
    { metric: 'Cadastros este mês', value: clients.filter(c => {
      const created = new Date(c.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length }
  ];

  const columns: ExportColumn[] = [
    { key: 'metric', label: 'Métrica' },
    { key: 'value', label: 'Valor' }
  ];

  const filename = options.filename || `resumo_clientes_${new Date().toISOString().split('T')[0]}.csv`;
  const csvContent = convertToCSV(summaryData, columns);
  downloadCSV(csvContent, filename);
}