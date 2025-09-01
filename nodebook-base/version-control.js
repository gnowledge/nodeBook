import { promises as fsp } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Git-based Version Control for NodeBook
 * Manages version history for CNL files and graph data
 */
export class GitVersionControl {
    constructor(dataPath = './data') {
        this.dataPath = dataPath;
    }

    /**
     * Get the Git repository path for a specific graph
     */
    getGraphGitPath(userId, graphId) {
        return path.join(this.dataPath, 'users', userId.toString(), 'graphs', graphId);
    }

    /**
     * Initialize Git repository for a graph
     */
    async initializeGit(userId, graphId) {
        const graphPath = this.getGraphGitPath(userId, graphId);
        
        try {
            // Check if Git repo already exists
            await fsp.access(path.join(graphPath, '.git'));
            console.log(`[GitVersionControl] Git repo already exists for graph ${graphId}`);
            return true;
        } catch (error) {
            // Git repo doesn't exist, initialize it
            try {
                await execAsync('git init', { cwd: graphPath });
                console.log(`[GitVersionControl] Initialized Git repo for graph ${graphId}`);
                return true;
            } catch (gitError) {
                console.error(`[GitVersionControl] Failed to initialize Git for graph ${graphId}:`, gitError);
                return false;
            }
        }
    }

    /**
     * Configure Git user for the repository
     */
    async configureGit(userId, graphId, userName, userEmail) {
        const graphPath = this.getGraphGitPath(userId, graphId);
        
        try {
            await execAsync(`git config user.name "${userName}"`, { cwd: graphPath });
            await execAsync(`git config user.email "${userEmail}"`, { cwd: graphPath });
            console.log(`[GitVersionControl] Configured Git user for graph ${graphId}`);
            return true;
        } catch (error) {
            console.error(`[GitVersionControl] Failed to configure Git for graph ${graphId}:`, error);
            return false;
        }
    }

    /**
     * Add files to Git staging area
     */
    async addFiles(userId, graphId, files = []) {
        const graphPath = this.getGraphGitPath(userId, graphId);
        
        try {
            if (files.length === 0) {
                // Add all files
                await execAsync('git add .', { cwd: graphPath });
            } else {
                // Add specific files
                for (const file of files) {
                    await execAsync(`git add "${file}"`, { cwd: graphPath });
                }
            }
            console.log(`[GitVersionControl] Added files to staging for graph ${graphId}`);
            return true;
        } catch (error) {
            console.error(`[GitVersionControl] Failed to add files for graph ${graphId}:`, error);
            return false;
        }
    }

    /**
     * Commit changes to Git repository
     */
    async commit(userId, graphId, message, author = null) {
        const graphPath = this.getGraphGitPath(userId, graphId);
        
        try {
            // Check if there are changes to commit
            const { stdout: status } = await execAsync('git status --porcelain', { cwd: graphPath });
            
            if (!status.trim()) {
                console.log(`[GitVersionControl] No changes to commit for graph ${graphId}`);
                return { success: true, message: 'No changes to commit' };
            }

            // Create commit with optional author override
            let commitCommand = `git commit -m "${message.replace(/"/g, '\\"')}"`;
            if (author) {
                commitCommand += ` --author="${author}"`;
            }

            const { stdout } = await execAsync(commitCommand, { cwd: graphPath });
            console.log(`[GitVersionControl] Committed changes for graph ${graphId}: ${message}`);
            
            return { 
                success: true, 
                commitId: this.extractCommitId(stdout),
                message: 'Changes committed successfully'
            };
        } catch (error) {
            console.error(`[GitVersionControl] Failed to commit for graph ${graphId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get the latest commit for a graph
     */
    async getLatestCommit(userId, graphId) {
        const graphPath = this.getGraphGitPath(userId, graphId);
        
        try {
            const { stdout } = await execAsync(
                `git log --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso --max-count=1`,
                { cwd: graphPath }
            );

            if (!stdout.trim()) {
                return null;
            }

            const [hash, author, email, date, message] = stdout.trim().split('|');
            return {
                hash,
                author,
                email,
                date: new Date(date),
                message,
                shortId: hash.substring(0, 7)
            };
        } catch (error) {
            console.error(`[GitVersionControl] Failed to get latest commit for graph ${graphId}:`, error);
            return null;
        }
    }

    /**
     * Get version history for a graph
     */
    async getHistory(userId, graphId, limit = 50) {
        const graphPath = this.getGraphGitPath(userId, graphId);
        
        try {
            const { stdout } = await execAsync(
                `git log --pretty=format:"%H|%an|%ae|%ad|%s" --date=iso --max-count=${limit}`,
                { cwd: graphPath }
            );

            if (!stdout.trim()) {
                return [];
            }

            const commits = stdout.trim().split('\n').map(line => {
                const [hash, author, email, date, message] = line.split('|');
                return {
                    id: hash,
                    author,
                    email,
                    date: new Date(date),
                    message,
                    shortId: hash.substring(0, 7)
                };
            });

            console.log(`[GitVersionControl] Retrieved ${commits.length} commits for graph ${graphId}`);
            return commits;
        } catch (error) {
            console.error(`[GitVersionControl] Failed to get history for graph ${graphId}:`, error);
            return [];
        }
    }

    /**
     * Get specific version content
     */
    async getVersion(userId, graphId, commitId) {
        const graphPath = this.getGraphGitPath(userId, graphId);
        
        try {
            // Get CNL content for the specific commit
            const { stdout: cnlContent } = await execAsync(
                `git show ${commitId}:graph.cnl`,
                { cwd: graphPath }
            );

            // Get manifest for the specific commit
            let manifestContent = null;
            try {
                const { stdout: manifest } = await execAsync(
                    `git show ${commitId}:manifest.json`,
                    { cwd: graphPath }
                );
                manifestContent = JSON.parse(manifest);
            } catch (manifestError) {
                // Manifest might not exist in older commits
                console.log(`[GitVersionControl] No manifest found for commit ${commitId}`);
            }

            console.log(`[GitVersionControl] Retrieved version ${commitId} for graph ${graphId}`);
            return {
                commitId,
                cnl: cnlContent,
                manifest: manifestContent,
                timestamp: new Date()
            };
        } catch (error) {
            console.error(`[GitVersionControl] Failed to get version ${commitId} for graph ${graphId}:`, error);
            return null;
        }
    }

    /**
     * Revert to a specific version
     */
    async revertToVersion(userId, graphId, commitId) {
        const graphPath = this.getGraphGitPath(userId, graphId);
        
        try {
            // Checkout the specific commit
            await execAsync(`git checkout ${commitId} -- .`, { cwd: graphPath });
            
            // Create a new commit for the revert
            await execAsync(`git add .`, { cwd: graphPath });
            await execAsync(`git commit -m "Reverted to version ${commitId.substring(0, 7)}"`, { cwd: graphPath });
            
            console.log(`[GitVersionControl] Reverted graph ${graphId} to version ${commitId}`);
            return { success: true, message: 'Reverted successfully' };
        } catch (error) {
            console.error(`[GitVersionControl] Failed to revert graph ${graphId} to version ${commitId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Compare two versions
     */
    async compareVersions(userId, graphId, commitId1, commitId2) {
        const graphPath = this.getGraphGitPath(userId, graphId);
        
        try {
            const { stdout } = await execAsync(
                `git diff ${commitId1} ${commitId2} -- graph.cnl`,
                { cwd: graphPath }
            );

            console.log(`[GitVersionControl] Compared versions ${commitId1} and ${commitId2} for graph ${graphId}`);
            return {
                diff: stdout,
                commitId1,
                commitId2
            };
        } catch (error) {
            console.error(`[GitVersionControl] Failed to compare versions for graph ${graphId}:`, error);
            return { error: error.message };
        }
    }

    /**
     * Create a new branch
     */
    async createBranch(userId, graphId, branchName) {
        const graphPath = this.getGraphGitPath(userId, graphId);
        
        try {
            await execAsync(`git checkout -b ${branchName}`, { cwd: graphPath });
            console.log(`[GitVersionControl] Created branch ${branchName} for graph ${graphId}`);
            return { success: true, branchName };
        } catch (error) {
            console.error(`[GitVersionControl] Failed to create branch ${branchName} for graph ${graphId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * List all branches
     */
    async listBranches(userId, graphId) {
        const graphPath = this.getGraphGitPath(userId, graphId);
        
        try {
            const { stdout } = await execAsync('git branch -a', { cwd: graphPath });
            const branches = stdout.trim().split('\n').map(branch => {
                const cleanBranch = branch.replace(/^\*?\s*/, '').replace(/^remotes\/origin\//, '');
                return cleanBranch;
            }).filter(branch => branch.length > 0);

            console.log(`[GitVersionControl] Listed ${branches.length} branches for graph ${graphId}`);
            return branches;
        } catch (error) {
            console.error(`[GitVersionControl] Failed to list branches for graph ${graphId}:`, error);
            return [];
        }
    }

    /**
     * Extract commit ID from Git output
     */
    extractCommitId(gitOutput) {
        const match = gitOutput.match(/\[([a-f0-9]{7,})\]/);
        return match ? match[1] : null;
    }

    /**
     * Check if Git is available on the system
     */
    async isGitAvailable() {
        try {
            await execAsync('git --version');
            return true;
        } catch (error) {
            console.error('[GitVersionControl] Git is not available on the system');
            return false;
        }
    }
}
