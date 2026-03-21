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
  user_id: string;
  pessoa_id: string | null;
  numero_cracha: string | null;
  nome: string;
  tipo_pessoa: 'Aluno' | 'Visitante' | null;
  horario_entrada: string;
  horario_saida: string | null;
  created_at: string;
};

type Pessoa = {
  id: string;
  nome: string;
  tipo: 'Aluno' | 'Visitante';
  created_at?: string;
};

export default function App() {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const [novoUsuarioEmail, setNovoUsuarioEmail] = useState('');
  const [novoUsuarioSenha, setNovoUsuarioSenha] = useState('');
  const [criandoUsuario, setCriandoUsuario] = useState(false);

  const [numeroCracha, setNumeroCracha] = useState('');

  const [buscaNomeAberto, setBuscaNomeAberto] = useState('');
  const [buscaCrachaAberto, setBuscaCrachaAberto] = useState('');
  const [buscaDataAberto, setBuscaDataAberto] = useState('');

  const [buscaNomeHistorico, setBuscaNomeHistorico] = useState('');
  const [buscaDataHistorico, setBuscaDataHistorico] = useState('');
  const [buscaHoraHistorico, setBuscaHoraHistorico] = useState('');

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);

  const [nomePessoa, setNomePessoa] = useState('');
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [buscaPessoa, setBuscaPessoa] = useState('');
  const [pessoaSelecionada, setPessoaSelecionada] = useState<Pessoa | null>(null);
  const [loadingPessoas, setLoadingPessoas] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const currentUser = session?.user ?? null;
        setUserId(currentUser?.id ?? null);

        if (currentUser?.id) {
          carregarProfile(currentUser.id);
          carregarPessoas('');
          carregarRegistros();
        }
      } catch (error) {
        console.error('Erro no init:', error);
      } finally {
        setSessionLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      try {
        const currentUser = session?.user ?? null;
        setUserId(currentUser?.id ?? null);

        if (currentUser?.id) {
          carregarProfile(currentUser.id);
          carregarPessoas('');
          carregarRegistros();
        } else {
          setProfile(null);
          setRegistros([]);
          setPessoas([]);
          setPessoaSelecionada(null);
        }
      } catch (error) {
        console.error('Erro no onAuthStateChange:', error);
      } finally {
        setSessionLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
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
        console.error('Erro ao carregar profile:', error);
        return null;
      }

      if (!data) {
        setProfile(null);
        return null;
      }

      setProfile(data as UserProfile);
      return data;
    } catch (error) {
      console.error('Erro inesperado ao carregar profile:', error);
      return null;
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
        console.error('Erro ao carregar pessoas:', error);
        alert(`Erro ao carregar pessoas: ${error.message}`);
        return;
      }

      setPessoas((data as Pessoa[]) || []);
    } catch (error) {
      console.error('Erro inesperado ao carregar pessoas:', error);
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
        console.error('Erro ao carregar registros:', error);
        alert(`Erro ao carregar registros: ${error.message}`);
        return;
      }

      setRegistros(data as Registro[]);
    } catch (error) {
      console.error('Erro inesperado ao carregar registros:', error);
    } finally {
      setLoadingRegistros(false);
    }
  }

  async function login() {
    if (!email || !senha) {
      alert('Preencha e-mail e senha.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      alert(error.message);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  async function cadastrarPessoa(tipo: 'Aluno' | 'Visitante') {
    if (!nomePessoa.trim()) {
      alert('Informe o nome.');
      return;
    }

    const { error } = await supabase.from('pessoas').insert({
      nome: nomePessoa.trim(),
      tipo,
    });

    if (error) {
      console.error('Erro ao cadastrar pessoa:', error);
      alert(`Erro ao cadastrar pessoa: ${error.message}`);
      return;
    }

    alert(`${tipo} cadastrado com sucesso.`);
    setNomePessoa('');
    await carregarPessoas('');
  }

  async function cadastrarUsuarioInterno() {
    if (!profile?.can_consult) {
      alert('Seu usuário não possui permissão para cadastrar usuários.');
      return;
    }

    if (!novoUsuarioEmail || !novoUsuarioSenha) {
      alert('Preencha e-mail e senha do novo usuário.');
      return;
    }

    try {
      setCriandoUsuario(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        alert('Sessão inválida.');
        return;
      }

      const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: novoUsuarioEmail,
          password: novoUsuarioSenha,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result.error || 'Erro ao cadastrar usuário.');
        return;
      }

      alert('Usuário cadastrado com sucesso.');
      setNovoUsuarioEmail('');
      setNovoUsuarioSenha('');
    } catch (error) {
      console.error('Erro ao cadastrar usuário interno:', error);
      alert('Erro ao cadastrar usuário.');
    } finally {
      setCriandoUsuario(false);
    }
  }

  function limparFormularioLancamento() {
    setNumeroCracha('');
    setPessoaSelecionada(null);
    setBuscaPessoa('');
  }

  async function registrarEntrada() {
    if (!userId) {
      alert('Usuário não autenticado.');
      return;
    }

    if (!pessoaSelecionada) {
      alert('Selecione um Aluno ou Visitante.');
      return;
    }

    if (!numeroCracha.trim()) {
      alert('Informe o número do crachá.');
      return;
    }

    const crachaNormalizado = numeroCracha.trim().toUpperCase();

    const { data: abertoNoDia, error: erroBusca } = await supabase
      .from('registros')
      .select('id, numero_cracha, horario_saida')
      .eq('numero_cracha', crachaNormalizado)
      .is('horario_saida', null)
      .order('horario_entrada', { ascending: false })
      .limit(1);

    if (erroBusca) {
      console.error('erroBusca:', erroBusca);
      alert(`Erro ao verificar registro em aberto: ${erroBusca.message}`);
      return;
    }

    if (abertoNoDia && abertoNoDia.length > 0) {
      alert('Já existe uma entrada em aberto para esse crachá.');
      return;
    }

    const agora = new Date().toISOString();

    const { error } = await supabase.from('registros').insert({
      user_id: userId,
      pessoa_id: pessoaSelecionada.id,
      numero_cracha: crachaNormalizado,
      nome: pessoaSelecionada.nome,
      tipo_pessoa: pessoaSelecionada.tipo,
      horario_entrada: agora,
      horario_saida: null,
    });

    if (error) {
      console.error('Erro ao salvar entrada:', error);
      alert(`Erro ao salvar entrada: ${error.message}`);
      return;
    }

    alert('Entrada registrada com sucesso.');
    limparFormularioLancamento();
    await carregarRegistros();
    document.getElementById('secao-registros')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function registrarSaida(id: number) {
    const agora = new Date().toISOString();

    const { data, error } = await supabase
      .from('registros')
      .update({ horario_saida: agora })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Erro ao registrar saída:', error);
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

  const registrosAbertosFiltrados = useMemo(() => {
    return registros.filter((item) => {
      if (item.horario_saida) return false;

      const bateNome =
        !buscaNomeAberto ||
        item.nome.toLowerCase().includes(buscaNomeAberto.trim().toLowerCase());

      const bateCracha =
        !buscaCrachaAberto ||
        (item.numero_cracha || '')
          .toLowerCase()
          .includes(buscaCrachaAberto.trim().toLowerCase());

      const dataEntrada = localDateValue(item.horario_entrada);
      const bateData = !buscaDataAberto || dataEntrada === buscaDataAberto;

      return bateNome && bateCracha && bateData;
    });
  }, [registros, buscaNomeAberto, buscaCrachaAberto, buscaDataAberto]);

  const registrosFiltradosHistorico = useMemo(() => {
    return registros.filter((item) => {
      const bateNome =
        !buscaNomeHistorico ||
        item.nome.toLowerCase().includes(buscaNomeHistorico.trim().toLowerCase());

      const dataEntradaLocal = localDateValue(item.horario_entrada);
      const bateData = !buscaDataHistorico || dataEntradaLocal === buscaDataHistorico;

      const horaEntrada = localHourValue(item.horario_entrada);
      const horaSaida = localHourValue(item.horario_saida);
      const bateHora =
        !buscaHoraHistorico ||
        horaEntrada.includes(buscaHoraHistorico) ||
        horaSaida.includes(buscaHoraHistorico);

      return bateNome && bateData && bateHora;
    });
  }, [registros, buscaNomeHistorico, buscaDataHistorico, buscaHoraHistorico]);

  function imprimirOuSalvarPDF() {
    window.print();
  }

  if (sessionLoading) {
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
            <p>Sistema privado para acesso interno.</p>
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

  const podeCadastrarUsuarios = !!profile?.can_consult;

  return (
    <div className="page app-bg">
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>Controle de Entrada e Saída</h1>
            <p className="subtitle">
              Usuário: {profile?.email || 'sem e-mail'} • Perfil:{' '}
              {podeCadastrarUsuarios ? 'gerente' : 'usuário'}
            </p>
          </div>

          <button className="btn-secondary" onClick={sair}>
            Sair
          </button>
        </header>

        {podeCadastrarUsuarios && (
          <section className="card">
            <h2>Cadastro interno de usuários</h2>

            <div className="form-grid">
              <div className="field">
                <label>E-mail do usuário</label>
                <input
                  type="email"
                  placeholder="novo.usuario@dominio.com"
                  value={novoUsuarioEmail}
                  onChange={(e) => setNovoUsuarioEmail(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Senha provisória</label>
                <input
                  type="password"
                  placeholder="Digite a senha provisória"
                  value={novoUsuarioSenha}
                  onChange={(e) => setNovoUsuarioSenha(e.target.value)}
                />
              </div>
            </div>

            <div className="actions-row">
              <button
                className="btn-primary"
                onClick={cadastrarUsuarioInterno}
                disabled={criandoUsuario}
              >
                {criandoUsuario ? 'Cadastrando...' : 'Cadastrar usuário'}
              </button>
            </div>
          </section>
        )}

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

        <section className="card">
          <h2>Selecionar aluno / visitante</h2>

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

          {pessoaSelecionada && (
            <p style={{ marginTop: 16 }}>
              Selecionado: <strong>{pessoaSelecionada.nome}</strong> ({pessoaSelecionada.tipo})
            </p>
          )}

          <div style={{ marginTop: 16 }}>
            {loadingPessoas ? (
              <p>Carregando pessoas...</p>
            ) : pessoas.length === 0 ? (
              <p className="empty">Nenhuma pessoa encontrada.</p>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Tipo</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pessoas.map((pessoa) => (
                      <tr key={pessoa.id}>
                        <td>{pessoa.nome}</td>
                        <td>{pessoa.tipo}</td>
                        <td>
                          <button
                            className="btn-secondary"
                            onClick={() => setPessoaSelecionada(pessoa)}
                          >
                            Selecionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <h2>Lançamento de entrada</h2>

          {pessoaSelecionada && (
            <p style={{ marginBottom: 16 }}>
              Selecionado: <strong>{pessoaSelecionada.nome}</strong> ({pessoaSelecionada.tipo})
            </p>
          )}

          <div className="form-grid">
            <div className="field">
              <label>N° do Crachá</label>
              <input
                type="text"
                placeholder="Digite o número do crachá"
                value={numeroCracha}
                onChange={(e) => setNumeroCracha(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="actions-row">
            <button className="btn-primary" onClick={registrarEntrada}>
              Registrar entrada
            </button>
            <button className="btn-secondary" onClick={limparFormularioLancamento}>
              Limpar
            </button>
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

        <section className="card">
          <h2>Consulta do histórico</h2>

          <div className="filters-grid">
            <div className="field">
              <label>Buscar por nome</label>
              <input
                type="text"
                placeholder="Digite o nome"
                value={buscaNomeHistorico}
                onChange={(e) => setBuscaNomeHistorico(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Buscar por data</label>
              <input
                type="date"
                value={buscaDataHistorico}
                onChange={(e) => setBuscaDataHistorico(e.target.value)}
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
            <button className="btn-secondary" onClick={imprimirOuSalvarPDF}>
              Imprimir / Salvar em PDF
            </button>
          </div>
        </section>

        <section className="card">
          <h2>Histórico de registros</h2>

          {loadingRegistros ? (
            <p>Carregando registros...</p>
          ) : registrosFiltradosHistorico.length === 0 ? (
            <p className="empty">Nenhum registro encontrado.</p>
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
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltradosHistorico.map((item) => (
                    <tr key={item.id}>
                      <td>{item.numero_cracha || '-'}</td>
                      <td>{item.nome}</td>
                      <td>{formatarDataHora(item.horario_entrada)}</td>
                      <td>
                        {item.horario_saida ? formatarDataHora(item.horario_saida) : '-'}
                      </td>
                      <td>
                        {item.horario_saida ? (
                          <span className="badge closed">Fechado</span>
                        ) : (
                          <span className="badge open">Em aberto</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function formatarDataHora(valor: string) {
  const data = new Date(valor);

  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}