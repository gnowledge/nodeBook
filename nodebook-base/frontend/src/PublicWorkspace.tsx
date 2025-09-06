import React, { useEffect, useState } from 'react';
import styles from './App.module.css';
import { TopBar } from './TopBar';
import { JsonView } from './JsonView';
import editorIcon from './assets/editor.svg';
import visualizationIcon from './assets/visualization.svg';
import jsonDataIcon from './assets/jsonData.svg';
import nodesIcon from './assets/nodes.svg';
import schemaIcon from './assets/schema.svg';
import p2pIcon from './assets/p2p.svg';
import { API_BASE_URL } from './api-config';
import { Visualization } from './Visualization';
import { NodeCard } from './NodeCard';
import { CNLEditor } from './CNLEditorComponent';

interface PublicWorkspaceProps {
  graphId: string;
  onGoToDashboard: () => void;
  onShowAuth: () => void;
}

export function PublicWorkspace({ graphId, onGoToDashboard, onShowAuth }: PublicWorkspaceProps) {
  const [nodes, setNodes] = useState<any[]>([]);
  const [relations, setRelations] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<any[]>([]);
  const [cnlText, setCnlText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'graph' | 'cnl' | 'json'>('graph');

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`${API_BASE_URL}/api/public/graphs/${graphId}/cnl`);
        if (!res.ok) throw new Error('Failed to load public graph data');
        const data = await res.json();
        if (!isMounted) return;
        setNodes(data.nodes || []);
        setRelations(data.relations || []);
        setAttributes(data.attributes || []);
        setCnlText(data.cnl || '');
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || 'Failed to load');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [graphId]);

  // Disabled tab button helper
  const DisabledTab = ({ title, icon }: { title: string; icon: React.ReactNode }) => (
    <button className={styles.tabButton} title={`${title} (Login required)`} disabled style={{ opacity: 0.45, cursor: 'not-allowed' }}>
      {icon}
    </button>
  );

  return (
    <div className={styles.container}>
      <TopBar
        isAuthenticated={false}
        user={null}
        onGoToDashboard={onGoToDashboard}
        onGoToApp={() => {}}
        onShowAuth={onShowAuth}
        onLogout={() => {}}
        currentView="public-workspace"
        onSelectPage={() => {}}
      />

      <div className={styles.content}>
        {loading ? (
          <div className={styles.placeholder}>Loading public workspace...</div>
        ) : error ? (
          <div className={styles.placeholder}>{error}</div>
        ) : (
          <main className={styles.mainContent}>
            <div className={styles.visualizationContainer}>
              <div className={styles.tabsContainer}>
                <div className={styles.verticalNav}>
                  <div className={styles.verticalTabs}>
                    <button className={`${styles.tabButton} ${activeTab === 'graph' ? styles.active : ''}`} title="Graph (Read-only)" onClick={() => setActiveTab('graph')}>
                      <img src={visualizationIcon} alt="Graph" className={styles.tabButtonIcon} />
                    </button>
                    <button className={`${styles.tabButton} ${activeTab === 'cnl' ? styles.active : ''}`} title="CNL (Read-only)" onClick={() => setActiveTab('cnl')}>
                      <img src={editorIcon} alt="Editor" className={styles.tabButtonIcon} />
                    </button>
                    <button className={`${styles.tabButton} ${activeTab === 'json' ? styles.active : ''}`} title="JSON Data (Read-only)" onClick={() => setActiveTab('json')}>
                      <span className={styles.jsonIcon}>{'{-}'}</span>
                    </button>
                    {/* Other tabs are visible but disabled */}
                    <DisabledTab title="Nodes" icon={<img src={nodesIcon} alt="Nodes" className={styles.tabButtonIcon} />} />
                    <DisabledTab title="SlideShow" icon={<span className={styles.slideshowIcon}>🎬</span>} />
                    <DisabledTab title="Schema" icon={<span className={styles.schemaIcon}><img src={schemaIcon} alt="Schema" className={styles.schemaIconImg} /></span>} />
                    <DisabledTab title="Peer-to-Peer" icon={<img src={p2pIcon} alt="Peer" className={styles.p2pIcon} />} />
                    <DisabledTab title="Media" icon={<span className={styles.mediaIcon}>📁</span>} />
                  </div>
                </div>

                <div className={styles.tabContent}>
                  <div className={styles.mediaContainer}>
                    {activeTab === 'graph' && (
                      <div className={styles.visualizationWrapper}>
                        <Visualization 
                          nodes={nodes} 
                          relations={relations} 
                          attributes={attributes}
                          onNodeSelect={setSelectedNodeId}
                          graphMode={'richgraph'}
                        />
                        {selectedNodeId && (
                          <div className={styles.selectedNodeCard}>
                            <NodeCard
                              node={nodes.find(n => n.id === selectedNodeId) || nodes[0]}
                              allNodes={nodes}
                              allRelations={relations}
                              attributes={attributes}
                              isActive={true}
                              onSelectNode={setSelectedNodeId}
                              onImportContext={() => {}}
                              nodeRegistry={{}}
                              isPublic={true}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'cnl' && (
                      <div>
                        <CNLEditor 
                          value={cnlText || ''}
                          onChange={() => {}}
                          language="cnl"
                          readOnly={true}
                          placeholder="CNL will appear here..."
                        />
                      </div>
                    )}

                    {activeTab === 'json' && (
                      <div>
                        <JsonView data={{ nodes, relations, attributes, cnl: cnlText }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        )}
      </div>
    </div>
  );
}

export default PublicWorkspace;


