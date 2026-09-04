import { useState, useMemo, useRef, useEffect } from 'react';
import { format, formatDistanceToNowStrict, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign, Plus, Minus, Lock, Unlock, Clock, ArrowDownCircle, ArrowUpCircle, Loader2, Receipt, TrendingUp, TrendingDown, RefreshCw, Barcode, CheckCircle, Search, Download, Filter, Calendar, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import {
  useOpenRegister,
  useRegisterHistory,
  useRegisterMovements,
  useOpenCashRegister,
  useCloseCashRegister,
  useAddCashMovement,
  useNextOpeningSuggestion,
} from '@/hooks/useCashRegister';
import { useMyStoreRole } from '@/hooks/useStores';
import { useFindLabelByBarcode, useMarkLabelSold, ProductLabel } from '@/hooks/useProductLabels';
import { RegisterHistoryDetailDialog } from '@/components/admin/cash/RegisterHistoryDetailDialog';
import { toast } from 'sonner';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const movementTypeLabels: Record<string, string> = {
  sale: 'Venda',
  withdrawal: 'Sangria',
  supply: 'Suprimento',
  adjustment: 'Ajuste',
};

export default function CashRegister() {
  const { data: storeInfo } = useMyStoreRole();
  const { data: openRegister, isLoading } = useOpenRegister();
  const { data: history = [] } = useRegisterHistory(60);
  const { data: movements = [] } = useRegisterMovements(openRegister?.id);
  const openMutation = useOpenCashRegister();
  const closeMutation = useCloseCashRegister();
  const movementMutation = useAddCashMovement();

  const [openAmount, setOpenAmount] = useState('');
  const [closeAmount, setCloseAmount] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [nextDayAmount, setNextDayAmount] = useState('');
  const [movementDialog, setMovementDialog] = useState<'withdrawal' | 'supply' | null>(null);
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDesc, setMovementDesc] = useState('');
  const [closeDialog, setCloseDialog] = useState(false);
  const [historyDetail, setHistoryDetail] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedLabel, setScannedLabel] = useState<ProductLabel | null>(null);
  const [movementFilter, setMovementFilter] = useState<string>('all');
  const [movementSearch, setMovementSearch] = useState('');
  const [historyMonth, setHistoryMonth] = useState<string>('current');
  const [historyOperator, setHistoryOperator] = useState<string>('all');
  const [receiptDialog, setReceiptDialog] = useState<any>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const findLabel = useFindLabelByBarcode();
  const markSold = useMarkLabelSold();
  const { data: nextSuggestion } = useNextOpeningSuggestion();

  // Pre-fill opening amount with the suggestion from yesterday's close
  useEffect(() => {
    if (!openRegister && nextSuggestion && openAmount === '') {
      setNextDayAmount('');
      setOpenAmount(String(nextSuggestion.amount));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openRegister, nextSuggestion?.amount]);

  const handleBarcodeScan = async () => {
    const barcode = barcodeInput.trim();
    if (!barcode) return;
    try {
      const label = await findLabel.mutateAsync(barcode);
      if (!label) {
        toast.error('Etiqueta não encontrada ou já vendida');
        return;
      }
      setScannedLabel(label);
    } catch {
      toast.error('Erro ao buscar etiqueta');
    }
  };

  const handleConfirmSale = async () => {
    if (!scannedLabel || !openRegister) return;
    try {
      await markSold.mutateAsync({ labelId: scannedLabel.id });
      await movementMutation.mutateAsync({
        registerId: openRegister.id,
        type: 'sale',
        amount: scannedLabel.price,
        description: `${scannedLabel.product_title}${scannedLabel.variant_title && scannedLabel.variant_title !== 'Default' ? ` - ${scannedLabel.variant_title}` : ''} (Nº ${String(scannedLabel.label_number).padStart(3, '0')})`,
      });
      toast.success(`Venda de ${formatCurrency(scannedLabel.price)} registrada!`);
      setScannedLabel(null);
      setBarcodeInput('');
      setTimeout(() => barcodeRef.current?.focus(), 100);
    } catch {
      toast.error('Erro ao registrar venda');
    }
  };

  const handleOpen = async () => {
    const amount = parseFloat(openAmount);
    if (isNaN(amount) || amount < 0) { toast.error('Informe um valor válido'); return; }
    try {
      await openMutation.mutateAsync({ openingAmount: amount, storeId: storeInfo?.storeId });
      toast.success('Caixa aberto!');
      setOpenAmount('');
    } catch { toast.error('Erro ao abrir caixa'); }
  };

  const handleClose = async () => {
    if (!openRegister) return;
    const amount = parseFloat(closeAmount);
    if (isNaN(amount) || amount < 0) { toast.error('Informe o valor de fechamento'); return; }
    const nextAmt = nextDayAmount.trim() === '' ? null : parseFloat(nextDayAmount);
    if (nextAmt != null && (isNaN(nextAmt) || nextAmt < 0)) { toast.error('Valor de abertura amanhã inválido'); return; }
    if (nextAmt != null && nextAmt > amount) { toast.error('Valor para amanhã não pode ser maior que o valor em caixa'); return; }
    try {
      const closed = await closeMutation.mutateAsync({ registerId: openRegister.id, closingAmount: amount, notes: closeNotes, nextDayOpeningAmount: nextAmt });
      toast.success('Caixa fechado!');
      setCloseAmount('');
      setCloseNotes('');
      setNextDayAmount('');
      setCloseDialog(false);
      setReceiptDialog({ register: closed, totals: { sales: totalVendas, withdrawals: totalSangrias, supplies: totalSuprimentos, salesCount: movements.filter(m => m.type === 'sale').length } });
    } catch { toast.error('Erro ao fechar caixa'); }
  };

  const handleMovement = async () => {
    if (!openRegister || !movementDialog) return;
    const amount = parseFloat(movementAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Informe um valor válido'); return; }
    try {
      await movementMutation.mutateAsync({
        registerId: openRegister.id,
        type: movementDialog,
        amount,
        description: movementDesc,
      });
      toast.success(movementDialog === 'withdrawal' ? 'Sangria registrada' : 'Suprimento registrado');
      setMovementDialog(null);
      setMovementAmount('');
      setMovementDesc('');
    } catch { toast.error('Erro ao registrar movimentação'); }
  };

  const currentTotal = () => {
    if (!openRegister) return 0;
    let total = openRegister.opening_amount;
    movements.forEach(m => {
      if (m.type === 'sale' || m.type === 'supply') total += m.amount;
      if (m.type === 'withdrawal') total -= m.amount;
    });
    return total;
  };

  // Giro calculations
  const totalEntradas = movements.filter(m => m.type === 'sale' || m.type === 'supply').reduce((s, m) => s + m.amount, 0);
  const totalSaidas = movements.filter(m => m.type === 'withdrawal').reduce((s, m) => s + m.amount, 0);
  const giroLiquido = totalEntradas - totalSaidas;
  const totalVendas = movements.filter(m => m.type === 'sale').reduce((s, m) => s + m.amount, 0);
  const totalSuprimentos = movements.filter(m => m.type === 'supply').reduce((s, m) => s + m.amount, 0);
  const totalSangrias = movements.filter(m => m.type === 'withdrawal').reduce((s, m) => s + m.amount, 0);

  const filteredMovements = useMemo(() => {
    let m = movements;
    if (movementFilter !== 'all') m = m.filter(x => x.type === movementFilter);
    if (movementSearch.trim()) {
      const q = movementSearch.trim().toLowerCase();
      m = m.filter(x => (x.description || '').toLowerCase().includes(q));
    }
    return m;
  }, [movements, movementFilter, movementSearch]);

  // History filters & monthly stats
  const closedHistory = useMemo(() => history.filter((r: any) => r.status === 'closed'), [history]);

  const operatorOptions = useMemo(() => {
    const map = new Map<string, string>();
    closedHistory.forEach((r: any) => {
      if (r.opened_by && r.opened_by_name) map.set(r.opened_by, r.opened_by_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [closedHistory]);

  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    closedHistory.forEach((r: any) => {
      const d = new Date(r.opened_at);
      set.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });
    return Array.from(set).sort().reverse();
  }, [closedHistory]);

  const filteredHistory = useMemo(() => {
    let h = closedHistory;
    if (historyMonth !== 'all') {
      const ym = historyMonth === 'current'
        ? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
        : historyMonth;
      h = h.filter((r: any) => {
        const d = new Date(r.opened_at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === ym;
      });
    }
    if (historyOperator !== 'all') h = h.filter((r: any) => r.opened_by === historyOperator);
    return h;
  }, [closedHistory, historyMonth, historyOperator]);

  const monthlyStats = useMemo(() => {
    const totalClosing = filteredHistory.reduce((s, r: any) => s + Number(r.closing_amount || 0), 0);
    const totalDifference = filteredHistory.reduce((s, r: any) => s + Number(r.difference || 0), 0);
    const avg = filteredHistory.length > 0 ? totalClosing / filteredHistory.length : 0;
    return { count: filteredHistory.length, totalClosing, totalDifference, avg };
  }, [filteredHistory]);

  const exportHistoryCSV = () => {
    const rows: string[][] = [['Data', 'Operador', 'Abertura', 'Esperado', 'Fechamento', 'Diferença', 'Observações']];
    filteredHistory.forEach((r: any) => {
      rows.push([
        format(new Date(r.opened_at), 'dd/MM/yyyy HH:mm'),
        r.opened_by_name || '-',
        Number(r.opening_amount || 0).toFixed(2),
        Number(r.expected_amount || 0).toFixed(2),
        Number(r.closing_amount || 0).toFixed(2),
        Number(r.difference || 0).toFixed(2),
        r.notes || '',
      ]);
    });
    const csv = rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caixa-historico-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Controle de Caixa" subtitle="Abertura, fechamento e movimentações" />

      {!openRegister ? (
        <Card>
          <CardHeader><CardTitle className="font-light flex items-center gap-2"><Unlock className="h-5 w-5" /> Abrir Caixa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 max-w-xs">
              <Label>Valor Inicial (R$)</Label>
              <Input type="number" min="0" step="0.01" value={openAmount} onChange={e => setOpenAmount(e.target.value)} placeholder="0,00" />
              {nextSuggestion && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Sugerido pelo fechamento de {nextSuggestion.closedAt ? format(new Date(nextSuggestion.closedAt), 'dd/MM', { locale: ptBR }) : 'ontem'}: <strong>{formatCurrency(nextSuggestion.amount)}</strong>
                  </span>
                  {openAmount !== '' && (
                    <button type="button" onClick={() => setOpenAmount('')} className="text-primary hover:underline">
                      Limpar
                    </button>
                  )}
                </div>
              )}
            </div>
            {storeInfo?.storeName && (
              <p className="text-sm text-muted-foreground">Loja: <strong>{storeInfo.storeName}</strong></p>
            )}
            <Button onClick={handleOpen} disabled={openMutation.isPending}>
              {openMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Abrir Caixa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Barcode Scanner */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Barcode className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Venda Rápida por Etiqueta</p>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={barcodeRef}
                    placeholder="Escanear código de barras..."
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeScan(); } }}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <Button onClick={handleBarcodeScan} disabled={!barcodeInput.trim() || findLabel.isPending}>
                  {findLabel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Open register summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Abertura</p>
                <p className="text-xl font-medium">{formatCurrency(openRegister.opening_amount)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(openRegister.opened_at), "dd/MM HH:mm", { locale: ptBR })}
                  {' · há '}{formatDistanceToNowStrict(new Date(openRegister.opened_at), { locale: ptBR })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">Saldo Esperado</p>
                <p className="text-xl font-medium">{formatCurrency(currentTotal())}</p>
                <p className="text-xs mt-1">
                  <span className={giroLiquido >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
                    {giroLiquido >= 0 ? '+' : ''}{formatCurrency(giroLiquido)}
                  </span>
                  <span className="text-muted-foreground ml-1">vs. abertura · {movements.length} mov.</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex flex-col justify-between h-full">
                <Badge variant="default" className="w-fit mb-2">Aberto</Badge>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" onClick={() => setMovementDialog('withdrawal')}>
                    <ArrowDownCircle className="h-4 w-4 mr-1" /> Sangria
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setMovementDialog('supply')}>
                    <ArrowUpCircle className="h-4 w-4 mr-1" /> Suprimento
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setCloseDialog(true)}>
                    <Lock className="h-4 w-4 mr-1" /> Fechar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Giro Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <p className="text-xs text-muted-foreground">Vendas</p>
                </div>
                <p className="text-lg font-medium text-green-700">{formatCurrency(totalVendas)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <ArrowUpCircle className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-muted-foreground">Suprimentos</p>
                </div>
                <p className="text-lg font-medium text-blue-700">{formatCurrency(totalSuprimentos)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  <p className="text-xs text-muted-foreground">Sangrias</p>
                </div>
                <p className="text-lg font-medium text-red-700">{formatCurrency(totalSangrias)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="h-4 w-4 text-purple-600" />
                  <p className="text-xs text-muted-foreground">Giro Líquido</p>
                </div>
                <p className={`text-lg font-medium ${giroLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(giroLiquido)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Movements log */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
              <CardTitle className="font-light text-base">Movimentações ({filteredMovements.length})</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input value={movementSearch} onChange={e => setMovementSearch(e.target.value)} placeholder="Buscar descrição" className="pl-8 h-8 w-44" />
                </div>
                <Select value={movementFilter} onValueChange={setMovementFilter}>
                  <SelectTrigger className="w-[140px] h-8"><Filter className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="sale">Vendas</SelectItem>
                    <SelectItem value="supply">Suprimentos</SelectItem>
                    <SelectItem value="withdrawal">Sangrias</SelectItem>
                    <SelectItem value="adjustment">Ajustes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhuma movimentação</TableCell></TableRow>
                  ) : (
                    filteredMovements.map(m => (
                      <TableRow key={m.id}>
                        <TableCell className="text-sm">{m.created_at ? format(new Date(m.created_at), 'HH:mm', { locale: ptBR }) : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={m.type === 'withdrawal' ? 'destructive' : m.type === 'supply' ? 'default' : 'secondary'}>
                            {movementTypeLabels[m.type] || m.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{m.description || '-'}</TableCell>
                        <TableCell className={`text-right font-medium ${m.type === 'withdrawal' ? 'text-destructive' : ''}`}>
                          {m.type === 'withdrawal' ? '-' : '+'}{formatCurrency(m.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Monthly stats */}
      {closedHistory.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Caixas Fechados</p>
              <p className="text-lg font-medium">{monthlyStats.count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total Fechado</p>
              <p className="text-lg font-medium">{formatCurrency(monthlyStats.totalClosing)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Média por Caixa</p>
              <p className="text-lg font-medium">{formatCurrency(monthlyStats.avg)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Diferença Acumulada</p>
              <p className={`text-lg font-medium ${monthlyStats.totalDifference === 0 ? '' : monthlyStats.totalDifference > 0 ? 'text-green-600' : 'text-destructive'}`}>
                {formatCurrency(monthlyStats.totalDifference)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
          <CardTitle className="font-light text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Histórico</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={historyMonth} onValueChange={setHistoryMonth}>
              <SelectTrigger className="w-[160px] h-8"><Calendar className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Mês atual</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
                {monthOptions.map(m => (
                  <SelectItem key={m} value={m}>{m.split('-').reverse().join('/')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {operatorOptions.length > 0 && (
              <Select value={historyOperator} onValueChange={setHistoryOperator}>
                <SelectTrigger className="w-[160px] h-8"><SelectValue placeholder="Operador" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos operadores</SelectItem>
                  {operatorOptions.map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" onClick={exportHistoryCSV} disabled={filteredHistory.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Operador</TableHead>
                <TableHead>Abertura</TableHead>
                <TableHead>Fechamento</TableHead>
                <TableHead>Diferença</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum caixa fechado neste filtro.</TableCell></TableRow>
              ) : filteredHistory.map((r: any) => (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setHistoryDetail(r.id)}>
                  <TableCell className="text-sm">{format(new Date(r.opened_at), 'dd/MM/yy', { locale: ptBR })}</TableCell>
                  <TableCell className="text-sm">{r.opened_by_name || '-'}</TableCell>
                  <TableCell>{formatCurrency(r.opening_amount)}</TableCell>
                  <TableCell>{r.closing_amount != null ? formatCurrency(r.closing_amount) : '-'}</TableCell>
                  <TableCell className={r.difference && r.difference !== 0 ? (r.difference > 0 ? 'text-green-600' : 'text-destructive') : ''}>
                    {r.difference != null ? formatCurrency(r.difference) : '-'}
                  </TableCell>
                  <TableCell><Badge variant="outline">Fechado</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <RegisterHistoryDetailDialog registerId={historyDetail} onClose={() => setHistoryDetail(null)} />

      {/* Movement Dialog */}
      <Dialog open={!!movementDialog} onOpenChange={() => setMovementDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-light">{movementDialog === 'withdrawal' ? 'Sangria' : 'Suprimento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Valor (R$)</Label>
              <Input type="number" min="0.01" step="0.01" value={movementAmount} onChange={e => setMovementAmount(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Motivo</Label>
              <Input value={movementDesc} onChange={e => setMovementDesc(e.target.value)} placeholder="Ex: Troco, despesa..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMovementDialog(null)}>Cancelar</Button>
            <Button onClick={handleMovement} disabled={movementMutation.isPending}>
              {movementMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Dialog */}
      <Dialog open={closeDialog} onOpenChange={setCloseDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-light">Fechar Caixa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Saldo esperado: <strong>{formatCurrency(currentTotal())}</strong></p>
            <div className="grid gap-2">
              <Label>Valor em Caixa (R$)</Label>
              <Input type="number" min="0" step="0.01" value={closeAmount} onChange={e => setCloseAmount(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Deixar para abrir amanhã (R$)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={nextDayAmount}
                onChange={e => setNextDayAmount(e.target.value)}
                placeholder="Opcional — ex: 250,00"
              />
              <p className="text-xs text-muted-foreground">
                Esse valor ficará separado no caixa e será sugerido automaticamente na próxima abertura.
              </p>
              {closeAmount && nextDayAmount && !isNaN(parseFloat(closeAmount)) && !isNaN(parseFloat(nextDayAmount)) && (
                <div className="mt-2 rounded border border-border bg-muted/40 p-3 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total em caixa</span>
                    <span className="font-medium">{formatCurrency(parseFloat(closeAmount))}</span>
                  </div>
                  <div className="flex justify-between text-primary">
                    <span>Fica para amanhã</span>
                    <span className="font-medium">{formatCurrency(parseFloat(nextDayAmount))}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1">
                    <span className="text-muted-foreground">Retirada agora</span>
                    <span className={`font-medium ${parseFloat(closeAmount) - parseFloat(nextDayAmount) < 0 ? 'text-destructive' : ''}`}>
                      {formatCurrency(parseFloat(closeAmount) - parseFloat(nextDayAmount))}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Observações</Label>
              <Textarea value={closeNotes} onChange={e => setCloseNotes(e.target.value)} placeholder="Opcional..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClose} disabled={closeMutation.isPending}>
              {closeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Fechar Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={!!receiptDialog} onOpenChange={() => setReceiptDialog(null)}>
        <DialogContent className="sm:max-w-sm print:shadow-none">
          <DialogHeader>
            <DialogTitle className="font-light flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Comprovante de Fechamento
            </DialogTitle>
          </DialogHeader>
          {receiptDialog?.register && (
            <div className="space-y-2 py-2 text-sm">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Data</span>
                <span>{format(new Date(receiptDialog.register.opened_at), "dd/MM/yyyy", { locale: ptBR })}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Abertura</span><span>{formatCurrency(receiptDialog.register.opening_amount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Vendas ({receiptDialog.totals.salesCount})</span><span className="text-green-600">+{formatCurrency(receiptDialog.totals.sales)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Suprimentos</span><span>+{formatCurrency(receiptDialog.totals.supplies)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Sangrias</span><span className="text-destructive">-{formatCurrency(receiptDialog.totals.withdrawals)}</span></div>
              <div className="flex justify-between border-t border-border pt-2 font-medium"><span>Esperado</span><span>{formatCurrency(Number(receiptDialog.register.expected_amount || 0))}</span></div>
              <div className="flex justify-between font-medium"><span>Em Caixa</span><span>{formatCurrency(Number(receiptDialog.register.closing_amount || 0))}</span></div>
              {receiptDialog.register.difference != null && (
                <div className={`flex justify-between font-medium ${Number(receiptDialog.register.difference) === 0 ? '' : Number(receiptDialog.register.difference) > 0 ? 'text-green-600' : 'text-destructive'}`}>
                  <span>Diferença</span><span>{formatCurrency(Number(receiptDialog.register.difference))}</span>
                </div>
              )}
              {receiptDialog.register.next_day_opening_amount != null && (
                <div className="flex justify-between border-t border-border pt-2 text-primary">
                  <span>Reservado para amanhã</span>
                  <span className="font-medium">{formatCurrency(Number(receiptDialog.register.next_day_opening_amount))}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir
            </Button>
            <Button onClick={() => setReceiptDialog(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scanned Label Confirmation Dialog */}
      <Dialog open={!!scannedLabel} onOpenChange={() => setScannedLabel(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-light flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Confirmar Venda
            </DialogTitle>
          </DialogHeader>
          {scannedLabel && (
            <div className="space-y-3 py-2">
              <div className="border border-border rounded p-3 space-y-1">
                <p className="font-medium">{scannedLabel.product_title}</p>
                {scannedLabel.variant_title && scannedLabel.variant_title !== 'Default' && (
                  <p className="text-sm text-muted-foreground">{scannedLabel.variant_title}</p>
                )}
                {scannedLabel.sku && (
                  <p className="text-xs text-muted-foreground">SKU: {scannedLabel.sku}</p>
                )}
                <p className="text-lg font-bold">{formatCurrency(scannedLabel.price)}</p>
                <Badge variant="outline" className="text-[10px] font-mono">
                  Nº {String(scannedLabel.label_number).padStart(3, '0')}
                </Badge>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setScannedLabel(null)}>Cancelar</Button>
            <Button onClick={handleConfirmSale} disabled={markSold.isPending || movementMutation.isPending}>
              {(markSold.isPending || movementMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
