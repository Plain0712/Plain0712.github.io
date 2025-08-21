// 위키 편집기 기능

document.addEventListener('DOMContentLoaded', function() {
    const addSectionBtn = document.getElementById('add-section-btn');
    const generateBtn = document.getElementById('generate-btn');
    const previewBtn = document.getElementById('preview-btn');
    const outputSection = document.getElementById('output-section');
    const contentEditor = document.querySelector('.content-editor');
    
    // 섹션 카운터
    let sectionCounter = 0;

    // Toolbar functionality
    const toolbar = document.querySelector('.editor-toolbar');
    if (toolbar) {
        toolbar.addEventListener('click', function(e) {
            const target = e.target.closest('button.toolbar-button, select.toolbar-select');
            if (!target) return;

            const command = target.dataset.command;
            let value = null;

            if (target.tagName === 'SELECT') {
                value = target.value;
                document.execCommand(command, false, value);
            } else {
                document.execCommand(command, false, null);
            }
        });
    }
    
    // 섹션 추가 기능
    addSectionBtn.addEventListener('click', function() {
        const customInput = document.createElement('div');
        customInput.className = 'custom-section-input show';
        customInput.innerHTML = `
            <input type="text" placeholder="섹션 이름을 입력하세요" id="section-name-input">
            <button type="button" id="confirm-section">추가</button>
            <button type="button" id="cancel-section">취소</button>
        `;
        
        addSectionBtn.parentElement.insertBefore(customInput, addSectionBtn);
        addSectionBtn.style.display = 'none';
        
        // 섹션 추가 확인
        customInput.querySelector('#confirm-section').addEventListener('click', function() {
            const sectionName = customInput.querySelector('#section-name-input').value.trim();
            if (sectionName) {
                addNewSection(sectionName);
            }
            resetAddSection(customInput);
        });
        
        // 섹션 추가 취소
        customInput.querySelector('#cancel-section').addEventListener('click', function() {
            resetAddSection(customInput);
        });
        
        // Enter 키로 추가
        customInput.querySelector('#section-name-input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                const sectionName = this.value.trim();
                if (sectionName) {
                    addNewSection(sectionName);
                }
                resetAddSection(customInput);
            }
        });
    });
    
    function resetAddSection(customInput) {
        customInput.remove();
        addSectionBtn.style.display = 'block';
    }
    
    function addNewSection(sectionName) {
        sectionCounter++;
        const sectionId = `custom-section-${sectionCounter}`;
        
        const newSection = document.createElement('div');
        newSection.className = 'section-template';
        newSection.setAttribute('data-section', sectionId);
        newSection.innerHTML = `
            <div class="section-header-edit">
                <h3>${sectionName}</h3>
                <button type="button" class="remove-section">×</button>
            </div>
            <div class="section-content-edit" contenteditable="true" placeholder="${sectionName} 내용을 입력하세요"></div>
        `;
        
        // 삭제 버튼 이벤트
        newSection.querySelector('.remove-section').addEventListener('click', function() {
            newSection.remove();
        });
        
        // 추가 버튼 앞에 삽입
        contentEditor.insertBefore(newSection, contentEditor.querySelector('.add-section-area'));
    }
    
    // 기존 삭제 버튼들에 이벤트 추가
    document.querySelectorAll('.remove-section').forEach(btn => {
        btn.addEventListener('click', function() {
            btn.closest('.section-template').remove();
        });
    });
    
    // 탭 전환 기능
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // 모든 탭 버튼과 콘텐츠 비활성화
            document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // 선택된 탭 활성화
            this.classList.add('active');
            document.getElementById(`${tabId}-tab`).classList.add('active');
        });
    });
    
    // 복사 기능
    document.getElementById('copy-search-data').addEventListener('click', function() {
        const output = document.getElementById('search-data-output');
        navigator.clipboard.writeText(output.textContent).then(() => {
            this.textContent = '복사완료!';
            setTimeout(() => {
                this.textContent = '복사';
            }, 2000);
        });
    });
    
    document.getElementById('copy-html-content').addEventListener('click', function() {
        const output = document.getElementById('html-content-output');
        navigator.clipboard.writeText(output.textContent).then(() => {
            this.textContent = '복사완료!';
            setTimeout(() => {
                this.textContent = '복사';
            }, 2000);
        });
    });
    
    // 데이터 생성 기능
    generateBtn.addEventListener('click', function() {
        const formData = collectFormData();
        if (validateFormData(formData)) {
            const searchData = generateSearchData(formData);
            const htmlContent = generateHtmlContent(formData);
            
            displayOutput(searchData, htmlContent);
            outputSection.style.display = 'block';
            outputSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    function collectFormData() {
        const title = document.getElementById('page-title').value.trim();
        const description = document.getElementById('page-description').value.trim();
        const keywords = document.getElementById('page-keywords').value.trim();
        
        const sections = [];
        document.querySelectorAll('.section-template').forEach(section => {
            const sectionTitle = section.querySelector('.section-header-edit h3').textContent;
            const sectionContent = section.querySelector('.section-content-edit').innerHTML.trim();
            if (sectionContent) {
                sections.push({
                    title: sectionTitle,
                    content: sectionContent
                });
            }
        });
        
        return {
            title,
            description,
            keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
            sections
        };
    }
    
    function validateFormData(data) {
        if (!data.title) {
            alert('제목을 입력해주세요.');
            return false;
        }
        if (!data.description) {
            alert('설명을 입력해주세요.');
            return false;
        }
        if (data.keywords.length === 0) {
            alert('키워드를 입력해주세요.');
            return false;
        }
        if (data.sections.length === 0) {
            alert('최소 하나의 섹션 내용을 입력해주세요.');
            return false;
        }
        return true;
    }
    
    function generateSearchData(data) {
        const today = new Date();
        const dateString = today.getFullYear() + '-' + 
                          String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(today.getDate()).padStart(2, '0');
        
        // ID를 제목에서 생성 (한글을 영문으로 변환하는 간단한 방법)
        const id = data.title.toLowerCase()
                     .replace(/\s+/g, '-')
                     .replace(/[^\w\-가-힣]/g, '')
                     .substring(0, 50);
        
        const searchDataObject = {
            id: id,
            title: data.title,
            url: `${id}.html`,
            category: data.keywords[0] || '기타', // 첫 번째 키워드를 카테고리로 사용
            description: data.description,
            keywords: data.keywords,
            lastModified: dateString
        };
        
        return JSON.stringify(searchDataObject, null, 4);
    }
    
    function generateHtmlContent(data) {
        const today = new Date();
        const dateString = today.getFullYear() + '.' + 
                          String(today.getMonth() + 1).padStart(2, '0') + '.' + 
                          String(today.getDate()).padStart(2, '0');
        
        let sectionsHtml = '';
        let tocItems = '';
        
        data.sections.forEach((section, index) => {
            const sectionId = section.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-가-힣]/g, '');
            
            tocItems += `                                <li><a href="#${sectionId}">${section.title}</a></li>\n`;
            
            sectionsHtml += `                            <div id="${sectionId}" class="content-section">
                                <div class="section-header">
                                    <h2>${section.title}</h2>
                                    <button class="section-toggle" data-section="${sectionId}-content">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="m6 9 6 6 6-6"></path>
                                        </svg>
                                    </button>
                                </div>
                                <div class="section-content" id="${sectionId}-content">
                                    ${formatSectionContent(section.content)}
                                </div>
                            </div>

`;
        });
        
        return `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title} - Plain0712</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="wiki.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
</head>
<body>
    <header class="wiki-header">
        <div class="header-container">
            <a href="index.html" class="nav-home">PLAIN0712</a>
            <div class="nav-breadcrumb">
                <span class="breadcrumb-separator">/</span>
                <span class="breadcrumb-current">WIKI</span>
            </div>
            <div class="nav-meta">
                <span class="nav-date">AUG.2024</span>
            </div>
        </div>
    </header>

    <main class="wiki-container">
        <article class="wiki-content">
            <div class="content-wrapper">
                <div class="content-main">
                    <header class="content-header">
                        <h1 class="content-title">${data.title}</h1>
                        <div class="content-meta">
                            <span class="meta-date">${dateString}</span>
                            <span class="meta-separator">·</span>
                            <span class="meta-category">${data.keywords.join(', ')}</span>
                        </div>
                    </header>

                    <nav class="table-of-contents">
                        <div class="toc-header">
                            <h3>목차</h3>
                            <button class="toc-toggle" id="toc-toggle">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="m6 9 6 6 6-6"></path>
                                </svg>
                            </button>
                        </div>
                        <div class="toc-content" id="toc-content">
                            <ol>
${tocItems}                            </ol>
                        </div>
                    </nav>

                    <section class="content-body">
${sectionsHtml}                        </section>

                    <footer class="content-footer">
                        <div class="tags">
${data.keywords.map(keyword => `                            <span class="tag">${keyword}</span>`).join('\n')}
                        </div>
                        
                        <div class="edit-info">
                            <p>마지막 수정: ${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일</p>
                        </div>
                    </footer>
                </div>

                <aside class="wiki-sidebar">
                    <div class="sidebar-search">
                        <div class="search-container-small">
                            <input type="text" class="search-input-small" placeholder="검색">
                            <button class="search-button-small" type="submit">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <path d="m21 21-4.35-4.35"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="sidebar-section">
                        <h3>최근 문서</h3>
                        <ul class="recent-list">
                            <li><a href="#" class="recent-link">스위스 타이포그래피</a></li>
                            <li><a href="#" class="recent-link">GitHub Pages 배포</a></li>
                            <li><a href="#" class="recent-link">CSS Grid Layout</a></li>
                            <li><a href="#" class="recent-link">디자인 시스템</a></li>
                        </ul>
                    </div>

                    <div class="sidebar-section">
                        <h3>관련 문서</h3>
                        <ul class="related-list">
                            <li><a href="#" class="related-link">미니멀리즘</a></li>
                            <li><a href="#" class="related-link">바우하우스</a></li>
                            <li><a href="#" class="related-link">모던 디자인</a></li>
                        </ul>
                    </div>
                </aside>
            </div>
        </article>
    </main>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // 목차 토글
            const tocToggle = document.getElementById('toc-toggle');
            const tocContent = document.getElementById('toc-content');
            
            if (tocToggle && tocContent) {
                tocToggle.addEventListener('click', function() {
                    const isCollapsed = tocContent.classList.contains('collapsed');
                    
                    if (isCollapsed) {
                        tocContent.classList.remove('collapsed');
                        tocToggle.classList.remove('collapsed');
                    } else {
                        tocContent.classList.add('collapsed');
                        toggle.classList.add('collapsed');
                    }
                });
            }
            
            // 섹션 토글
            const sectionToggles = document.querySelectorAll('.section-toggle');
            
            sectionToggles.forEach(function(toggle) {
                toggle.addEventListener('click', function() {
                    const targetId = toggle.getAttribute('data-section');
                    const targetContent = document.getElementById(targetId);
                    
                    if (targetContent) {
                        const isCollapsed = targetContent.classList.contains('collapsed');
                        
                        if (isCollapsed) {
                            targetContent.classList.remove('collapsed');
                            toggle.classList.remove('collapsed');
                        } else {
                            targetContent.classList.add('collapsed');
                            toggle.classList.add('collapsed');
                        }
                    }
                });
            });
        });
    </script>
</body>
</html>`;
    }
    
    function formatSectionContent(content) {
        // This function now directly returns the HTML content from the editor
        return content;
    }
    
    function displayOutput(searchData, htmlContent) {
        document.getElementById('search-data-output').textContent = searchData;
        document.getElementById('html-content-output').textContent = htmlContent;
    }
    
    // 미리보기 기능 (간단한 구현)
    previewBtn.addEventListener('click', function() {
        const formData = collectFormData();
        if (validateFormData(formData)) {
            const htmlContent = generateHtmlContent(formData);
            const newWindow = window.open('', '_blank');
            newWindow.document.write(htmlContent);
            newWindow.document.close();
        }
    });
});
});