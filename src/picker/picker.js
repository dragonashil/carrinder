class GoogleDriveFolderPicker {
    constructor() {
        this.currentFolderId = 'root';
        this.selectedFolder = null;
        this.folderHistory = [{ id: 'root', name: '루트 폴더' }];
        this.accessToken = null;
        
        this.init();
    }
    
    async init() {
        // Get access token from extension
        await this.getAccessToken();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load initial folder contents
        await this.loadFolderContents();
    }
    
    async getAccessToken() {
        try {
            // Send message to extension to get access token
            const response = await this.sendMessage({ action: 'getAccessToken' });
            if (response.success) {
                this.accessToken = response.token;
            } else {
                throw new Error(response.error || '액세스 토큰을 가져올 수 없습니다.');
            }
        } catch (error) {
            this.showError('인증 오류: ' + error.message);
        }
    }
    
    setupEventListeners() {
        // Cancel button
        document.getElementById('cancel-btn').addEventListener('click', () => {
            window.close();
        });
        
        // Select button
        document.getElementById('select-btn').addEventListener('click', () => {
            this.confirmSelection();
        });
        
        // New folder button
        document.getElementById('new-folder-btn').addEventListener('click', () => {
            this.createNewFolder();
        });
    }
    
    async loadFolderContents() {
        const folderList = document.getElementById('folder-list');
        folderList.innerHTML = '<div class="loading">폴더 내용을 불러오는 중...</div>';
        
        try {
            const items = await this.fetchFolderContents(this.currentFolderId);
            this.renderFolderContents(items);
            this.updateBreadcrumb();
        } catch (error) {
            this.showError('폴더 내용을 불러오는데 실패했습니다: ' + error.message);
            folderList.innerHTML = '<div class="empty">폴더 내용을 불러올 수 없습니다.</div>';
        }
    }
    
    async fetchFolderContents(parentId) {
        const query = `'${parentId}' in parents and trashed = false`;
        const url = `https://www.googleapis.com/drive/v3/files?` + new URLSearchParams({
            q: query,
            fields: 'files(id, name, parents, createdTime, modifiedTime, mimeType)',
            orderBy: 'folder, name'
        });
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || response.statusText);
        }
        
        const data = await response.json();
        return data.files || [];
    }
    
    getFileIcon(mimeType) {
        if (mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return '📊';
        if (mimeType.includes('document') || mimeType.includes('text')) return '📄';
        if (mimeType.includes('presentation')) return '📑';
        if (mimeType.includes('image')) return '🖼️';
        if (mimeType.includes('video')) return '🎥';
        if (mimeType.includes('audio')) return '🎵';
        if (mimeType.includes('pdf')) return '📋';
        return '📄';
    }
    
    renderFolderContents(items) {
        const folderList = document.getElementById('folder-list');
        
        if (items.length === 0) {
            folderList.innerHTML = '<div class="empty">이 폴더에는 파일이나 폴더가 없습니다.</div>';
            return;
        }
        
        folderList.innerHTML = items.map(item => {
            const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
            const icon = isFolder ? '📁' : this.getFileIcon(item.mimeType);
            const itemType = isFolder ? '폴더' : '파일';
            
            return `
                <div class="folder-item ${isFolder ? 'is-folder' : 'is-file'}" data-folder-id="${item.id}" data-folder-name="${item.name}" data-is-folder="${isFolder}">
                    <div class="folder-icon">${icon}</div>
                    <div class="folder-info">
                        <div class="folder-name">${item.name}</div>
                        <div class="folder-meta">${itemType} • ${item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString('ko-KR') : ''}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handlers
        folderList.querySelectorAll('.folder-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectFolder(item);
            });
            
            // Only add double-click for folders
            if (item.dataset.isFolder === 'true') {
                item.addEventListener('dblclick', () => {
                    this.navigateToFolder(item.dataset.folderId, item.dataset.folderName);
                });
            }
        });
    }
    
    selectFolder(folderItem) {
        // Remove previous selection
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked item
        folderItem.classList.add('selected');
        
        // Update selected folder
        this.selectedFolder = {
            id: folderItem.dataset.folderId,
            name: folderItem.dataset.folderName
        };
        
        // Show selected info
        this.showSelectedInfo();
        
        // Enable select button
        document.getElementById('select-btn').disabled = false;
    }
    
    showSelectedInfo() {
        const selectedInfo = document.getElementById('selected-info');
        const selectedName = document.getElementById('selected-name');
        const selectedId = document.getElementById('selected-id');
        
        selectedName.textContent = this.selectedFolder.name;
        selectedId.textContent = `ID: ${this.selectedFolder.id}`;
        selectedInfo.style.display = 'block';
    }
    
    async navigateToFolder(folderId, folderName) {
        // Add current folder to history
        this.folderHistory.push({ id: folderId, name: folderName });
        
        // Update current folder
        this.currentFolderId = folderId;
        
        // Clear selection
        this.selectedFolder = null;
        document.getElementById('selected-info').style.display = 'none';
        document.getElementById('select-btn').disabled = true;
        
        // Load folder contents
        await this.loadFolderContents();
    }
    
    updateBreadcrumb() {
        const breadcrumb = document.getElementById('breadcrumb');
        
        let breadcrumbHTML = '';
        for (let i = 0; i < this.folderHistory.length; i++) {
            const folder = this.folderHistory[i];
            const isLast = i === this.folderHistory.length - 1;
            
            if (i > 0) {
                breadcrumbHTML += ' > ';
            }
            
            const className = isLast ? 'breadcrumb-item current' : 'breadcrumb-item';
            breadcrumbHTML += `<span class="${className}" data-folder-id="${folder.id}">${folder.name}</span>`;
        }
        
        breadcrumb.innerHTML = breadcrumbHTML;
        
        // Add click handlers for breadcrumb navigation
        breadcrumb.querySelectorAll('.breadcrumb-item:not(.current)').forEach(item => {
            item.addEventListener('click', () => {
                this.navigateToBreadcrumb(item.dataset.folderId);
            });
        });
    }
    
    async navigateToBreadcrumb(folderId) {
        // Find the folder in history and truncate history
        const folderIndex = this.folderHistory.findIndex(f => f.id === folderId);
        
        if (folderIndex >= 0) {
            this.folderHistory = this.folderHistory.slice(0, folderIndex + 1);
            this.currentFolderId = folderId;
            
            // Clear selection
            this.selectedFolder = null;
            document.getElementById('selected-info').style.display = 'none';
            document.getElementById('select-btn').disabled = true;
            
            // Load folder contents
            await this.loadFolderContents();
        }
    }
    
    async createNewFolder() {
        const folderName = prompt('새 폴더 이름을 입력하세요:');
        
        if (!folderName || folderName.trim() === '') {
            return;
        }
        
        try {
            const response = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: folderName.trim(),
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [this.currentFolderId]
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || response.statusText);
            }
            
            const newFolder = await response.json();
            
            // Refresh the folder list
            await this.loadFolderContents();
            
            // Auto-select the newly created folder
            const newFolderElement = document.querySelector(`[data-folder-id="${newFolder.id}"]`);
            if (newFolderElement) {
                this.selectFolder(newFolderElement);
                newFolderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
        } catch (error) {
            this.showError('폴더 생성에 실패했습니다: ' + error.message);
        }
    }
    
    confirmSelection() {
        if (this.selectedFolder) {
            // Send message to extension
            this.sendMessage({
                action: 'folderSelected',
                folder: this.selectedFolder
            });
            
            // Close the window
            window.close();
        }
    }
    
    showError(message) {
        const errorDiv = document.getElementById('error');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
    
    sendMessage(message) {
        return new Promise((resolve) => {
            if (window.chrome && chrome.runtime) {
                chrome.runtime.sendMessage(message, (response) => {
                    resolve(response || {});
                });
            } else {
                resolve({ success: false, error: 'Chrome runtime not available' });
            }
        });
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new GoogleDriveFolderPicker();
});