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
  tipo_pessoa: string | null;
  acautelou: string;
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

  const [modoAuth, setModoAuth] = useState<'login' | 'cadastro'>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const [numeroCracha, setNumeroCracha] = useState('');
  const [boxAcautelou, setBoxAcautelou] = useState('');
  const [horarioEntrada, setHorarioEntrada] = useState('');
  const [horarioSaida, setHorarioSaida] = useState('');

  const [buscaNome, setBuscaNome] = useState('');
  const [buscaData, setBuscaData] = useState('');

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);

  const [nomePessoa, setNomePessoa] = useState('');
  const [tipoPessoa, setTipoPessoa] = useState<'Aluno' | 'Visitante'>('Aluno');
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
          await carregarProfile(currentUser.id);
          await carregarPessoas('');
          await carregarRegistros();
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
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const currentUser = session?.user ?? null;
        setUserId(currentUser?.id ?? null);

        if (currentUser?.id) {
          await carregarProfile(currentUser.id);
          await carregarPessoas('');
          await carregarRegistros();
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
        .single();

      if (error) {
        console.error('Erro ao carregar profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Erro inesperado ao carregar profile:', error);
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

  async function cadastrar() {
    if (!email || !senha) {
      alert('Preencha e-mail e senha.');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert('Cadastro realizado. Agora faça login.');
    setModoAuth('login');
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

  async function cadastrarPessoa() {
    if (!nomePessoa.trim()) {
      alert('Informe o nome do aluno ou visitante.');
      return;
    }

    const { error } = await supabase.from('pessoas').insert({
      nome: nomePessoa.trim(),
      tipo: tipoPessoa,
    });

    if (error) {
      console.error('Erro ao cadastrar pessoa:', error);
      alert(`Erro ao cadastrar pessoa: ${error.message}`);
      return;
    }

    alert('Pessoa cadastrada com sucesso.');
    setNomePessoa('');
    setTipoPessoa('Aluno');
    await carregarPessoas('');
  }

  function limparFormularioLancamento() {
    setNumeroCracha('');
    setBoxAcautelou('');
    setHorarioEntrada('');
    setHorarioSaida('');
    setPessoaSelecionada(null);
    setBuscaPessoa('');
  }

  async function salvarEntrada() {
    if (!userId) {
      alert('Usuário não autenticado.');
      return;
    }

    if (!pessoaSelecionada) {
      alert('Selecione um Aluno ou Visitante.');
      return;
    }

    if (!boxAcautelou || !horarioEntrada) {
      alert('Preencha box acautelou e horário de entrada.');
      return;
    }

    const crachaNormalizado = numeroCracha.trim()
      ? numeroCracha.trim().toUpperCase()
      : null;

    if (crachaNormalizado) {
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
    }

    const { error } = await supabase.from('registros').insert({
      user_id: userId,
      pessoa_id: pessoaSelecionada.id,
      numero_cracha: crachaNormalizado,
      nome: pessoaSelecionada.nome,
      tipo_pessoa: pessoaSelecionada.tipo,
      box_acautelou: boxAcautelou,
      horario_entrada: horarioEntrada,
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
  }

  async function lancarSaida() {
    if (!horarioSaida) {
      alert('Informe o horário de saída.');
      return;
    }

    if (!numeroCracha.trim() && !pessoaSelecionada) {
      alert('Informe o crachá ou selecione a pessoa para lançar a saída.');
      return;
    }

    let query = supabase
      .from('registros')
      .select('*')
      .is('horario_saida', null)
      .order('horario_entrada', { ascending: false })
      .limit(1);

    const crachaNormalizado = numeroCracha.trim()
      ? numeroCracha.trim().toUpperCase()
      : '';

    if (crachaNormalizado) {
      query = query.eq('numero_cracha', crachaNormalizado);
    } else if (pessoaSelecionada) {
      query = query.eq('pessoa_id', pessoaSelecionada.id);
    }

    const { data, error: erroAberto } = await query;

    if (erroAberto) {
      console.error('erroAberto:', erroAberto);
      alert(`Erro ao localizar registro em aberto: ${erroAberto.message}`);
      return;
    }

    if (!data || data.length === 0) {
      alert('Não existe registro em aberto para esse crachá ou pessoa.');
      return;
    }

    const registroAberto = data[0] as Registro;

    const { error: erroUpdate } = await supabase
      .from('registros')
      .update({
        horario_saida: horarioSaida,
      })
      .eq('id', registroAberto.id);

    if (erroUpdate) {
      console.error('Erro ao registrar saída:', erroUpdate);
      alert(`Erro ao registrar saída: ${erroUpdate.message}`);
      return;
    }

    alert('Saída registrada com sucesso.');
    limparFormularioLancamento();
    await carregarRegistros();
  }

  const registrosFiltrados = useMemo(() => {
    return registros.filter((item) => {
      const bateNome =
        !buscaNome || item.nome.toLowerCase().includes(buscaNome.trim().toLowerCase());

      const dataEntrada = item.horario_entrada?.slice(0, 10);
      const bateData = !buscaData || dataEntrada === buscaData;

      return bateNome && bateData;
    });
  }, [registros, buscaNome, buscaData]);

  if (sessionLoading) {
    return (
      <div className="page center-screen">
        <div className="card auth-card">
          <h1>Carregando...</h1>
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
              Sistema privado para controle de acesso com cadastro de aluno ESMPDFT
            </p>
          </div>

          <div className="card auth-card">
            <h2>{modoAuth === 'login' ? 'Entrar' : 'Cadastrar'}</h2>

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
              {modoAuth === 'login' ? (
                <>
                  <button className="btn-primary" onClick={login}>
                    Entrar
                  </button>
                  <button className="btn-secondary" onClick={() => setModoAuth('cadastro')}>
                    Criar conta
                  </button>
                </>
              ) : (
                <>
                  <button className="btn-primary" onClick={cadastrar}>
                    Cadastrar
                  </button>
                  <button className="btn-secondary" onClick={() => setModoAuth('login')}>
                    Voltar ao login
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page app-bg">
      <div className="app-shell">
        <header className="topbar">
          <div>
            <h1>Controle de Entrada e Saída</h1>
            <p className="subtitle">
              Usuário: {profile?.email || 'sem e-mail'}{' '}
              {profile?.can_consult ? '• Perfil com consulta' : ''}
            </p>
          </div>

          <button className="btn-secondary" onClick={sair}>
            Sair
          </button>
        </header>

        <section className="card">
          <h2>Cadastro de Aluno / Visitante</h2>

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

            <div className="field">
              <label>Tipo</label>
              <select
                value={tipoPessoa}
                onChange={(e) => setTipoPessoa(e.target.value as 'Aluno' | 'Visitante')}
              >
                <option value="Aluno">Aluno</option>
                <option value="Visitante">Visitante</option>
              </select>
            </div>
          </div>

          <div className="actions-row">
            <button className="btn-primary" onClick={cadastrarPessoa}>
              Cadastrar pessoa
            </button>
          </div>
        </section>

        <section className="card">
          <h2>Selecionar Aluno / Visitante</h2>

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
          <h2>Lançamento</h2>

          <div className="form-grid">
            <div className="field">
              <label>N° do Crachá</label>
              <input
                type="text"
                placeholder="Opcional"
                value={numeroCracha}
                onChange={(e) => setNumeroCracha(e.target.value.toUpperCase())}
              />
              <small>O crachá pode ficar em branco.</small>
            </div>

            <div className="field">
              <label>Box Acautelou</label>
              <input
                type="text"
                placeholder="Ex.: Box 03"
                value={boxAcautelou}
                onChange={(e) => setBoxAcautelou(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Horário de entrada</label>
              <input
                type="datetime-local"
                value={horarioEntrada}
                onChange={(e) => setHorarioEntrada(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Horário de saída</label>
              <input
                type="datetime-local"
                value={horarioSaida}
                onChange={(e) => setHorarioSaida(e.target.value)}
              />
              <small>Preencha somente quando for lançar a saída.</small>
            </div>
          </div>

          <div className="actions-row">
            <button className="btn-primary" onClick={salvarEntrada}>
              Salvar entrada
            </button>
            <button className="btn-primary" onClick={lancarSaida}>
              Lançar saída
            </button>
            <button className="btn-secondary" onClick={limparFormularioLancamento}>
              Limpar
            </button>
          </div>
        </section>

        {profile?.can_consult ? (
          <>
            <section className="card">
              <h2>Consulta</h2>

              <div className="filters-grid">
                <div className="field">
                  <label>Buscar por nome</label>
                  <input
                    type="text"
                    placeholder="Digite o nome"
                    value={buscaNome}
                    onChange={(e) => setBuscaNome(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label>Buscar por data</label>
                  <input
                    type="date"
                    value={buscaData}
                    onChange={(e) => setBuscaData(e.target.value)}
                  />
                </div>
              </div>
            </section>

            <section className="card">
              <h2>Registros</h2>

              {loadingRegistros ? (
                <p>Carregando registros...</p>
              ) : registrosFiltrados.length === 0 ? (
                <p className="empty">Nenhum registro encontrado.</p>
              ) : (
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>Crachá</th>
                        <th>Nome</th>
                        <th>Tipo</th>
                        <th>Box Acautelou</th>
                        <th>Entrada</th>
                        <th>Saída</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrosFiltrados.map((item) => (
                        <tr key={item.id}>
                          <td>{item.numero_cracha || '-'}</td>
                          <td>{item.nome}</td>
                          <td>{item.tipo_pessoa || '-'}</td>
                          <td>{item.box_acautelou}</td>
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
          </>
        ) : (
          <section className="card">
            <h2>Consulta</h2>
            <p className="empty">
              Seu usuário não possui permissão para visualizar a busca e os registros.
            </p>
          </section>
        )}
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