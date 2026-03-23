import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

type UserProfile = {
  id: string;
  email: string;
  can_consult: boolean;
};

type Registro = {
  id: number;
  user_id?: string | null;
  pessoa_id?: string | null;
  numero_cracha: string | null;
  nome: string;
  tipo_pessoa?: 'Aluno' | 'Visitante' | null;
  horario_entrada: string;
  horario_saida: string | null;
  created_at?: string;
};

type Pessoa = {
  id: string;
  nome: string;
  tipo: 'Aluno' | 'Visitante';
  created_at?: string;
};

type FiltroAbertos = {
  nome: string;
  cracha: string;
  data: string;
};

type FiltroHistorico = {
  nome: string;
  dataInicio: string;
  dataFim: string;
  hora: string;
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const [nomePessoa, setNomePessoa] = useState('');
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [buscaPessoa, setBuscaPessoa] = useState('');
  const [loadingPessoas, setLoadingPessoas] = useState(false);

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);

  const [buscaNomeAberto, setBuscaNomeAberto] = useState('');
  const [buscaCrachaAberto, setBuscaCrachaAberto] = useState('');
  const [buscaDataAberto, setBuscaDataAberto] = useState('');
  const [filtroAbertosAplicado, setFiltroAbertosAplicado] = useState<FiltroAbertos>({
    nome: '',
    cracha: '',
    data: '',
  });

  const [buscaNomeHistorico, setBuscaNomeHistorico] = useState('');
  const [buscaDataInicioHistorico, setBuscaDataInicioHistorico] = useState('');
  const [buscaDataFimHistorico, setBuscaDataFimHistorico] = useState('');
  const [buscaHoraHistorico, setBuscaHoraHistorico] = useState('');
  const [filtroHistoricoAplicado, setFiltroHistoricoAplicado] = useState<FiltroHistorico>({
    nome: '',
    dataInicio: '',
    dataFim: '',
    hora: '',
  });

  const [modalCrachaAberto, setModalCrachaAberto] = useState(false);
  const [pessoaModal, setPessoaModal] = useState<Pessoa | null>(null);
  const [numeroCrachaModal, setNumeroCrachaModal] = useState('');

  useEffect(() => {
    let mounted = true;

    const timeout = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const user = session?.user ?? null;

        if (!mounted) return;

        setUserId(user?.id ?? null);

        if (user?.id) {
          carregarProfile(user.id);
          carregarPessoas('');
          carregarRegistros();
        }
      } catch (error) {
        console.error('Erro ao iniciar app:', error);
      } finally {
        if (mounted) setLoading(false);
        window.clearTimeout(timeout);
      }
    };

    init();

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;

      if (event === 'SIGNED_OUT') {
        setUserId(null);
        setProfile(null);
        setPessoas([]);
        setRegistros([]);
        setLoading(false);
        return;
      }

      if (user?.id) {
        setUserId(user.id);
        carregarProfile(user.id);
        carregarPessoas('');
        carregarRegistros();
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      window.clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, []);

  async function carregarProfile(uid: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, can_consult')
        .eq('id', uid)
        .maybeSingle();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return;
      }

      setProfile((data as UserProfile) || null);
    } catch (error) {
      console.error('Erro inesperado ao carregar perfil:', error);
    }
  }

  async function carregarPessoas(termo = buscaPessoa) {
    try {
      setLoadingPessoas(true);

      let query = supabase.from('pessoas').select('*').order('nome', { ascending: true });

      if (termo.trim()) {
        query = query.ilike('nome', `%${termo.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        alert(`Erro ao carregar pessoas: ${error.message}`);
        return;
      }

      setPessoas((data as Pessoa[]) || []);
    } catch (error) {
      console.error('Erro ao carregar pessoas:', error);
    } finally {
      setLoadingPessoas(false);
    }
  }

  async function carregarRegistros() {
    try {
      setLoadingRegistros(true);

      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .order('horario_entrada', { ascending: false });

      if (error) {
        alert(`Erro ao carregar registros: ${error.message}`);
        return;
      }

      setRegistros((data as Registro[]) || []);
    } catch (error) {
      console.error('Erro ao carregar registros:', error);
    } finally {
      setLoadingRegistros(false);
    }
  }

  async function login() {
    if (!email.trim() || !senha) {
      alert('Preencha e-mail e senha.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    if (error) {
      alert(error.message);
    }
  }

  async function sair() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(`Erro ao sair: ${error.message}`);
    }
  }

  async function cadastrarPessoa(tipo: 'Aluno' | 'Visitante') {
    if (!profile?.can_consult) {
      alert('Seu usuário não possui permissão para cadastrar.');
      return;
    }

    if (!nomePessoa.trim()) {
      alert('Informe o nome.');
      return;
    }

    const { error } = await supabase.from('pessoas').insert({
      nome: nomePessoa.trim(),
      tipo,
    });

    if (error) {
      alert(`Erro ao cadastrar pessoa: ${error.message}`);
      return;
    }

    alert(`${tipo} cadastrado com sucesso.`);
    setNomePessoa('');
    await carregarPessoas('');
  }

  async function excluirPessoa(id: string, nome: string) {
    if (!profile?.can_consult) {
      alert('Seu usuário não possui permissão para excluir.');
      return;
    }

    const confirmar = window.confirm(`Deseja excluir ${nome}?`);
    if (!confirmar) return;

    const { error } = await supabase.from('pessoas').delete().eq('id', id);

    if (error) {
      alert(`Erro ao excluir pessoa: ${error.message}`);
      return;
    }

    alert('Aluno/visitante excluído com sucesso.');
    await carregarPessoas('');
  }

  function abrirModalCracha(pessoa: Pessoa) {
    setPessoaModal(pessoa);
    setNumeroCrachaModal('');
    setModalCrachaAberto(true);
  }

  function fecharModalCracha() {
    setPessoaModal(null);
    setNumeroCrachaModal('');
    setModalCrachaAberto(false);
  }

  async function confirmarEntradaComCracha() {
    if (!userId) {
      alert('Usuário não autenticado.');
      return;
    }

    if (!pessoaModal) {
      alert('Nenhuma pessoa selecionada.');
      return;
    }

    if (!/^\d{3}$/.test(numeroCrachaModal)) {
      alert('O crachá deve conter exatamente 3 dígitos numéricos.');
      return;
    }

    const crachaNormalizado = numeroCrachaModal;

    const { data: aberto, error: erroBusca } = await supabase
      .from('registros')
      .select('id')
      .eq('numero_cracha', crachaNormalizado)
      .is('horario_saida', null)
      .limit(1);

    if (erroBusca) {
      alert(`Erro ao verificar registro em aberto: ${erroBusca.message}`);
      return;
    }

    if (aberto && aberto.length > 0) {
      alert('Já existe uma entrada em aberto para esse crachá.');
      return;
    }

    const { error } = await supabase.from('registros').insert({
      user_id: userId,
      pessoa_id: pessoaModal.id,
      numero_cracha: crachaNormalizado,
      nome: pessoaModal.nome,
      tipo_pessoa: pessoaModal.tipo,
      horario_entrada: new Date().toISOString(),
      horario_saida: null,
    });

    if (error) {
      alert(`Erro ao salvar entrada: ${error.message}`);
      return;
    }

    alert('Entrada registrada com sucesso.');
    fecharModalCracha();
    await carregarRegistros();
  }

  async function registrarSaida(id: number) {
    const agora = new Date().toISOString();

    const { data, error } = await supabase
      .from('registros')
      .update({ horario_saida: agora })
      .eq('id', id)
      .select();

    if (error) {
      alert(`Erro ao registrar saída: ${error.message}`);
      return;
    }

    if (!data || data.length === 0) {
      alert('Nenhum registro foi atualizado.');
      return;
    }

    setRegistros((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, horario_saida: agora } : item
      )
    );

    alert('Saída registrada com sucesso.');
  }

  function executarConsultaAbertos() {
    setFiltroAbertosAplicado({
      nome: buscaNomeAberto.trim(),
      cracha: buscaCrachaAberto.trim(),
      data: buscaDataAberto,
    });
  }

  function limparConsultaAbertos() {
    setBuscaNomeAberto('');
    setBuscaCrachaAberto('');
    setBuscaDataAberto('');
    setFiltroAbertosAplicado({
      nome: '',
      cracha: '',
      data: '',
    });
  }

  function executarConsultaHistorico() {
    setFiltroHistoricoAplicado({
      nome: buscaNomeHistorico.trim(),
      dataInicio: buscaDataInicioHistorico,
      dataFim: buscaDataFimHistorico,
      hora: buscaHoraHistorico,
    });
  }

  function limparConsultaHistorico() {
    setBuscaNomeHistorico('');
    setBuscaDataInicioHistorico('');
    setBuscaDataFimHistorico('');
    setBuscaHoraHistorico('');
    setFiltroHistoricoAplicado({
      nome: '',
      dataInicio: '',
      dataFim: '',
      hora: '',
    });
  }

  function localDateValue(valor: string) {
    const d = new Date(valor);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function localHourValue(valor: string | null) {
    if (!valor) return '';
    const d = new Date(valor);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  function formatarDataHora(valor: string) {
    return new Date(valor).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  function montarDescricaoPeriodo() {
    const inicio = filtroHistoricoAplicado.dataInicio || 'início';
    const fim = filtroHistoricoAplicado.dataFim || 'hoje';

    if (filtroHistoricoAplicado.dataInicio && filtroHistoricoAplicado.dataFim) {
      return `Período: ${filtroHistoricoAplicado.dataInicio} até ${filtroHistoricoAplicado.dataFim}`;
    }

    if (filtroHistoricoAplicado.dataInicio && !filtroHistoricoAplicado.dataFim) {
      return `Período: ${filtroHistoricoAplicado.dataInicio} até hoje`;
    }

    if (!filtroHistoricoAplicado.dataInicio && filtroHistoricoAplicado.dataFim) {
      return `Período: início até ${filtroHistoricoAplicado.dataFim}`;
    }

    return `Período: ${inicio} até ${fim}`;
  }

  function dataHoraEmissaoRelatorio() {
    return new Date().toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  const pessoasFiltradas = useMemo(() => {
    const termo = buscaPessoa.trim().toLowerCase();

    if (!termo) return pessoas;

    return pessoas.filter((item) =>
      item.nome.toLowerCase().includes(termo)
    );
  }, [pessoas, buscaPessoa]);

  const registrosAbertosFiltrados = useMemo(() => {
    return registros.filter((item) => {
      if (item.horario_saida) return false;

      const bateNome =
        !filtroAbertosAplicado.nome ||
        item.nome.toLowerCase().includes(filtroAbertosAplicado.nome.toLowerCase());

      const bateCracha =
        !filtroAbertosAplicado.cracha ||
        (item.numero_cracha || '')
          .toLowerCase()
          .includes(filtroAbertosAplicado.cracha.toLowerCase());

      const dataEntrada = localDateValue(item.horario_entrada);
      const bateData =
        !filtroAbertosAplicado.data || dataEntrada === filtroAbertosAplicado.data;

      return bateNome && bateCracha && bateData;
    });
  }, [registros, filtroAbertosAplicado]);

  const registrosFiltradosHistorico = useMemo(() => {
    return registros.filter((item) => {
      const bateNome =
        !filtroHistoricoAplicado.nome ||
        item.nome.toLowerCase().includes(filtroHistoricoAplicado.nome.toLowerCase());

      const dataEntrada = localDateValue(item.horario_entrada);
      const bateDataInicio =
        !filtroHistoricoAplicado.dataInicio ||
        dataEntrada >= filtroHistoricoAplicado.dataInicio;

      const bateDataFim =
        !filtroHistoricoAplicado.dataFim ||
        dataEntrada <= filtroHistoricoAplicado.dataFim;

      const horaEntrada = localHourValue(item.horario_entrada);
      const horaSaida = localHourValue(item.horario_saida);
      const bateHora =
        !filtroHistoricoAplicado.hora ||
        horaEntrada.includes(filtroHistoricoAplicado.hora) ||
        horaSaida.includes(filtroHistoricoAplicado.hora);

      return bateNome && bateDataInicio && bateDataFim && bateHora;
    });
  }, [registros, filtroHistoricoAplicado]);

  function imprimirRelatorio() {
    window.print();
  }

  function baixarCSVHistorico() {
    if (registrosFiltradosHistorico.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const linhas = [
      ['Data', 'Nome', 'Crachá', 'Entrada', 'Saída'],
      ...registrosFiltradosHistorico.map((item) => [
        localDateValue(item.horario_entrada),
        item.nome,
        item.numero_cracha || '',
        formatarDataHora(item.horario_entrada),
        item.horario_saida ? formatarDataHora(item.horario_saida) : '',
      ]),
    ];

    const csv = linhas
      .map((linha) =>
        linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(';')
      )
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio_registros.csv';
    link.click();

    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="page center-screen">
        <div className="card auth-card">
          <h1>Carregando sistema...</h1>
          <p className="empty">Aguarde alguns segundos.</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="page auth-page">
        <div className="auth-wrapper">
          <div className="brand-panel">
            <h1>Controle de Entrada e Saída</h1>
            <p>
              Sistema interno para cadastro de pessoas, controle de entrada e saída,
              consulta de registros e emissão de relatórios.
            </p>
          </div>

          <div className="card auth-card">
            <h2>Entrar</h2>

            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                placeholder="seuemail@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Senha</label>
              <input
                type="password"
                placeholder="Digite sua senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
            </div>

            <div className="auth-actions">
              <button className="btn-primary" onClick={login}>
                Entrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const podeGerenciar = profile?.can_consult === true;

  return (
    <div className="page app-bg">
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>Controle de Entrada e Saída</h1>
            <p className="subtitle">
              Usuário: {profile?.email || email || 'autenticado'} • Perfil:{' '}
              {podeGerenciar ? 'gestão' : 'consulta/operação'}
            </p>
          </div>

          <button className="btn-secondary" onClick={sair}>
            Sair
          </button>
        </header>

        {podeGerenciar && (
          <>
            <section className="card">
              <h2>Cadastro de aluno / visitante</h2>

              <div className="form-grid">
                <div className="field">
                  <label>Nome</label>
                  <input
                    type="text"
                    placeholder="Digite o nome"
                    value={nomePessoa}
                    onChange={(e) => setNomePessoa(e.target.value)}
                  />
                </div>
              </div>

              <div className="actions-row">
                <button className="btn-primary" onClick={() => cadastrarPessoa('Aluno')}>
                  Cadastrar aluno
                </button>
                <button className="btn-secondary" onClick={() => cadastrarPessoa('Visitante')}>
                  Cadastrar visitante
                </button>
              </div>
            </section>
          </>
        )}

        <section className="card">
          <h2>{podeGerenciar ? 'Selecionar / excluir aluno ou visitante' : 'Selecionar usuário para lançar crachá'}</h2>

          <div className="filters-grid">
            <div className="field">
              <label>Buscar por nome</label>
              <input
                type="text"
                placeholder="Digite o nome"
                value={buscaPessoa}
                onChange={(e) => setBuscaPessoa(e.target.value)}
              />
            </div>
          </div>

          <div className="actions-row">
            <button className="btn-primary" onClick={() => carregarPessoas()}>
              Buscar pessoa
            </button>
          </div>

          <div style={{ marginTop: 16 }}>
            {loadingPessoas ? (
              <p>Carregando pessoas...</p>
            ) : pessoasFiltradas.length === 0 ? (
              <p className="empty">Nenhuma pessoa encontrada.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Ação</th>
                      {podeGerenciar && <th>Excluir</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {pessoasFiltradas.map((pessoa) => (
                      <tr key={pessoa.id}>
                        <td>{pessoa.nome}</td>
                        <td>{pessoa.tipo}</td>
                        <td>
                          <button
                            className="btn-secondary"
                            onClick={() => abrirModalCracha(pessoa)}
                          >
                            Selecionar
                          </button>
                        </td>
                        {podeGerenciar && (
                          <td>
                            <button
                              className="btn-secondary"
                              onClick={() => excluirPessoa(pessoa.id, pessoa.nome)}
                            >
                              Excluir
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <h2>Consulta de registros em aberto</h2>

          <div className="filters-grid">
            <div className="field">
              <label>Buscar por nome</label>
              <input
                type="text"
                placeholder="Digite o nome"
                value={buscaNomeAberto}
                onChange={(e) => setBuscaNomeAberto(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Buscar por número do crachá</label>
              <input
                type="text"
                placeholder="Digite o número do crachá"
                value={buscaCrachaAberto}
                onChange={(e) => setBuscaCrachaAberto(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Buscar por data</label>
              <input
                type="date"
                value={buscaDataAberto}
                onChange={(e) => setBuscaDataAberto(e.target.value)}
              />
            </div>
          </div>

          <div className="actions-row">
            <button className="btn-primary" onClick={executarConsultaAbertos}>
              Executar consulta
            </button>
            <button className="btn-secondary" onClick={limparConsultaAbertos}>
              Limpar consulta
            </button>
          </div>
        </section>

        <section className="card" id="secao-registros">
          <h2>Registros em aberto</h2>

          {loadingRegistros ? (
            <p>Carregando registros...</p>
          ) : registrosAbertosFiltrados.length === 0 ? (
            <p className="empty">Nenhum registro em aberto.</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Crachá</th>
                    <th>Nome</th>
                    <th>Entrada</th>
                    <th>Saída</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosAbertosFiltrados.map((item) => (
                    <tr key={item.id}>
                      <td>{item.numero_cracha || '-'}</td>
                      <td>{item.nome}</td>
                      <td>{formatarDataHora(item.horario_entrada)}</td>
                      <td>-</td>
                      <td>
                        <span className="badge open">Em aberto</span>
                      </td>
                      <td>
                        <button
                          className="btn-primary"
                          onClick={() => registrarSaida(item.id)}
                        >
                          Registrar saída
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {podeGerenciar && (
          <>
            <section className="card">
              <h2>Consulta do histórico</h2>

              <div className="filters-grid">
                <div className="field">
                  <label>Buscar por nome</label>
                  <input
                    type="text"
                    placeholder="Digite o nome ou deixe em branco para todos"
                    value={buscaNomeHistorico}
                    onChange={(e) => setBuscaNomeHistorico(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Data inicial</label>
                  <input
                    type="date"
                    value={buscaDataInicioHistorico}
                    onChange={(e) => setBuscaDataInicioHistorico(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Data final</label>
                  <input
                    type="date"
                    value={buscaDataFimHistorico}
                    onChange={(e) => setBuscaDataFimHistorico(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Buscar por hora</label>
                  <input
                    type="time"
                    value={buscaHoraHistorico}
                    onChange={(e) => setBuscaHoraHistorico(e.target.value)}
                  />
                </div>
              </div>

              <div className="actions-row">
                <button className="btn-primary" onClick={executarConsultaHistorico}>
                  Executar consulta
                </button>
                <button className="btn-secondary" onClick={limparConsultaHistorico}>
                  Limpar consulta
                </button>
                <button className="btn-secondary" onClick={imprimirRelatorio}>
                  Imprimir relatório / Salvar em PDF
                </button>
                <button className="btn-secondary" onClick={baixarCSVHistorico}>
                  Baixar planilha
                </button>
              </div>
            </section>

            <section className="card" id="secao-relatorio">
              <div className="report-header">
                <h2>Relatório de registros</h2>
                <p><strong>{montarDescricaoPeriodo()}</strong></p>
                <p>
                  Filtro por nome:{' '}
                  <strong>
                    {filtroHistoricoAplicado.nome
                      ? filtroHistoricoAplicado.nome
                      : 'Todos os alunos / visitantes'}
                  </strong>
                </p>
                <p>
                  Filtro por hora:{' '}
                  <strong>
                    {filtroHistoricoAplicado.hora
                      ? filtroHistoricoAplicado.hora
                      : 'Todas as horas'}
                  </strong>
                </p>
                <p>
                  Emitido em: <strong>{dataHoraEmissaoRelatorio()}</strong>
                </p>
                <p>
                  Total de registros: <strong>{registrosFiltradosHistorico.length}</strong>
                </p>
              </div>

              {loadingRegistros ? (
                <p>Carregando registros...</p>
              ) : registrosFiltradosHistorico.length === 0 ? (
                <p className="empty">Nenhum registro encontrado.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th>Nome</th>
                        <th>Crachá</th>
                        <th>Entrada</th>
                        <th>Saída</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrosFiltradosHistorico.map((item) => (
                        <tr key={item.id}>
                          <td>{localDateValue(item.horario_entrada)}</td>
                          <td>{item.nome}</td>
                          <td>{item.numero_cracha || '-'}</td>
                          <td>{formatarDataHora(item.horario_entrada)}</td>
                          <td>
                            {item.horario_saida ? formatarDataHora(item.horario_saida) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {modalCrachaAberto && (
          <div className="modal-overlay">
            <div className="card auth-card modal-card">
              <h2>Lançar entrada</h2>

              <p style={{ marginBottom: 16 }}>
                Pessoa selecionada: <strong>{pessoaModal?.nome}</strong>
              </p>

              <div className="field">
                <label>Digite o número do crachá</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={3}
                  placeholder="Ex.: 123"
                  value={numeroCrachaModal}
                  onChange={(e) =>
                    setNumeroCrachaModal(e.target.value.replace(/\D/g, '').slice(0, 3))
                  }
                />
                <small>Obrigatório. Apenas 3 dígitos.</small>
              </div>

              <div className="auth-actions">
                <button className="btn-primary" onClick={confirmarEntradaComCracha}>
                  Confirmar entrada
                </button>
                <button className="btn-secondary" onClick={fecharModalCracha}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}