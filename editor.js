// 위키 편집기 기능

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    let lastFocusedEditable = null; // 마지막으로 포커스된 편집 가능 요소를 저장하는 변수

    const addSectionBtn = document.getElementById('add-section-btn');
    const generateBtn = document.getElementById('generate-btn');
    const previewBtn = document.getElementById('preview-btn');
    const outputSection = document.getElementById('output-section');
    const contentEditor = document.querySelector('.content-sections');
    
    // 이미지 업로드 요소
    const imageUploadBtn = document.getElementById('image-upload-btn');
    const imageUploadInput = document.getElementById('image-upload-input');
    
    // 모달 관련 요소들
    const loadModal = document.getElementById('load-modal');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const pageList = document.getElementById('page-list');
    
    // 속성 패널 관련 요소들
    const propertyPanel = document.getElementById('property-panel');
    const propertyTitle = document.getElementById('property-title');
    const propertyContent = document.getElementById('property-content');
    const propertyClose = document.getElementById('property-close');
    const propertyCancel = document.getElementById('property-cancel');
    const propertyApply = document.getElementById('property-apply');
    
    // 현재 선택된 요소
    let selectedElement = null;
    let selectedCells = [];
    let isSelectingCells = false;
    let selectionStartCell = null;
    
    // contenteditable 요소들 초기화
    const editableElements = document.querySelectorAll('[contenteditable="true"]');
    console.log('Found editable elements:', editableElements.length);
    
    editableElements.forEach(element => {
        console.log('Editable element:', element);
        // 기본 contenteditable 설정
        element.setAttribute('contenteditable', 'true');
        element.style.outline = 'none'; // 포커스 아웃라인 제거
    });

    // 이벤트 위임을 사용하여 편집 가능한 모든 요소의 포커스를 추적
    const editorContainer = document.querySelector('.editor-container');
    if (editorContainer) {
        editorContainer.addEventListener('focusin', (e) => {
            if (e.target.isContentEditable) {
                lastFocusedEditable = e.target;
                console.log('Last focused element set:', lastFocusedEditable);
            }
        });
    }
    
    // 섹션 카운터
    let sectionCounter = 0;

    // Toolbar functionality
    const toolbar = document.querySelector('.editor-toolbar');
    const textColorInput = document.getElementById('text-color');
    const highlightColorInput = document.getElementById('highlight-color');
    const textColorIndicator = document.getElementById('text-color-indicator');
    const highlightColorIndicator = document.getElementById('highlight-color-indicator');
    
    if (toolbar) {
        console.log('Toolbar initialized');
        // 툴바 버튼 클릭 처리
        toolbar.addEventListener('click', function(e) {
            console.log('Toolbar clicked:', e.target);
            const target = e.target.closest('button, select');
            if (!target) {
                console.log('No button target found');
                return;
            }
            
            e.preventDefault();
            
            console.log('Button clicked:', target);
            
            const command = target.dataset.command;
            console.log('Command:', command);
            
            if (!command) return;

            // 'insertTable' 명령은 그리드 이벤트에서 직접 처리되므로 여기서는 제외
            if (command === 'insertTable') return;

            if (command === 'createLink') {
                createLink();
                return;
            }

            let value = target.value;
            if (command === 'foreColor') {
                value = textColorInput.value;
            } else if (command === 'hiliteColor') {
                value = highlightColorInput.value;
            }

            executeCommand(command, value);
        });
        
        // 색상 버튼 클릭 처리
        const colorButtons = toolbar.querySelectorAll('.color-button');
        colorButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const command = this.dataset.command;
                const colorInput = command === 'foreColor' ? textColorInput : highlightColorInput;
                if (colorInput) {
                    colorInput.click();
                }
            });
        });
        
        // 색상 입력 변경 처리
        if (textColorInput) {
            textColorInput.addEventListener('input', function() {
                textColorIndicator.style.backgroundColor = this.value;
                executeCommand('foreColor', this.value);
            });
        }
        
        if (highlightColorInput) {
            highlightColorInput.addEventListener('input', function() {
                highlightColorIndicator.style.backgroundColor = this.value;
                executeCommand('hiliteColor', this.value);
            });
        }
        
        // 표 삽입 그리드 초기화
        initTableGrid();
    }
    
    // 테이블 리사이즈 핸들 추가 함수
    function addTableResizeHandles(table) {
        // 기존 핸들 제거
        table.querySelectorAll('.column-resize-handle').forEach(handle => handle.remove());
        
        const firstRow = table.rows[0];
        if (!firstRow) return;
        
        // 각 열에 리사이즈 핸들 추가
        Array.from(firstRow.cells).forEach((cell, index) => {
            if (index < firstRow.cells.length - 1) { // 마지막 열은 제외
                const handle = document.createElement('div');
                handle.className = 'column-resize-handle';
                handle.style.cssText = `
                    position: absolute;
                    top: 0;
                    right: -3px;
                    width: 6px;
                    height: 100%;
                    background: transparent;
                    cursor: col-resize;
                    z-index: 10;
                `;
                
                // 상대 위치 설정
                if (getComputedStyle(cell).position === 'static') {
                    cell.style.position = 'relative';
                }
                
                cell.appendChild(handle);
                
                // 드래그 이벤트 추가
                addResizeHandleEvents(handle, table, index);
            }
        });
    }
    
    // 리사이즈 핸들 이벤트 추가
    function addResizeHandleEvents(handle, table, columnIndex) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;
        
        handle.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            isResizing = true;
            startX = e.clientX;
            
            const firstRow = table.rows[0];
            const targetCell = firstRow.cells[columnIndex];
            startWidth = targetCell.offsetWidth;
            
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            
            const mouseMoveHandler = function(e) {
                if (!isResizing) return;
                
                const deltaX = e.clientX - startX;
                const newWidth = Math.max(50, startWidth + deltaX); // 최소 너비 50px
                
                // 해당 열의 모든 셀에 너비 적용
                for (let i = 0; i < table.rows.length; i++) {
                    const cell = table.rows[i].cells[columnIndex];
                    if (cell) {
                        cell.style.width = newWidth + 'px';
                    }
                }
            };
            
            const mouseUpHandler = function(e) {
                isResizing = false;
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                
                document.removeEventListener('mousemove', mouseMoveHandler);
                document.removeEventListener('mouseup', mouseUpHandler);
            };
            
            document.addEventListener('mousemove', mouseMoveHandler);
            document.addEventListener('mouseup', mouseUpHandler);
        });
    }

    // 표 그리드 초기화 함수
    function initTableGrid() {
        const tableBtn = document.getElementById('table-insert-btn');
        const tableSelector = document.getElementById('table-grid-selector');
        const tableGrid = document.getElementById('table-grid');
        const tableSizeDisplay = document.getElementById('table-size-display');
        const tableCustomBtn = document.getElementById('table-custom-btn');
        
        if (!tableBtn || !tableSelector || !tableGrid) return;
        
        // 8x8 그리드 생성
        for (let i = 0; i < 64; i++) {
            const cell = document.createElement('div');
            cell.className = 'table-cell';
            cell.dataset.row = Math.floor(i / 8);
            cell.dataset.col = i % 8;
            tableGrid.appendChild(cell);
        }
        
        // 표 버튼 클릭 이벤트
        tableBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            tableSelector.classList.toggle('show');
        });
        
        // 그리드 셀 호버 및 클릭 이벤트
        tableGrid.addEventListener('mouseover', function(e) {
            if (!e.target.classList.contains('table-cell')) return;
            
            const hoveredRow = parseInt(e.target.dataset.row);
            const hoveredCol = parseInt(e.target.dataset.col);
            
            // 모든 셀 선택 해제
            tableGrid.querySelectorAll('.table-cell').forEach(cell => {
                cell.classList.remove('selected');
            });
            
            // 선택된 영역까지 모든 셀 선택
            tableGrid.querySelectorAll('.table-cell').forEach(cell => {
                const row = parseInt(cell.dataset.row);
                const col = parseInt(cell.dataset.col);
                
                if (row <= hoveredRow && col <= hoveredCol) {
                    cell.classList.add('selected');
                }
            });
            
            // 크기 표시 업데이트
            tableSizeDisplay.textContent = `${hoveredCol + 1} x ${hoveredRow + 1} 표`;
        });
        
        // 그리드 클릭 이벤트
        tableGrid.addEventListener('click', function(e) {
            if (!e.target.classList.contains('table-cell')) return;
            
            const rows = parseInt(e.target.dataset.row) + 1;
            const cols = parseInt(e.target.dataset.col) + 1;
            
            insertTableWithSize(rows, cols);
            tableSelector.classList.remove('show');
        });
        
        // 사용자 정의 표 버튼
        if (tableCustomBtn) {
            tableCustomBtn.addEventListener('click', function(e) {
                e.preventDefault();
                insertCustomTable();
                tableSelector.classList.remove('show');
            });
        }
        
        // 외부 클릭 시 그리드 숨기기
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.table-insert-wrapper')) {
                tableSelector.classList.remove('show');
            }
        });
        
        // 그리드에서 마우스가 벗어날 때 표시 리셋
        tableGrid.addEventListener('mouseleave', function() {
            tableGrid.querySelectorAll('.table-cell').forEach(cell => {
                cell.classList.remove('selected');
            });
            tableSizeDisplay.textContent = '표 선택';
        });
    }
    
    function restoreFocus() {
        if (lastFocusedEditable) {
            lastFocusedEditable.focus();
            return true;
        }
        // Fallback if no focus was tracked
        let editorToFocus = document.getElementById('page-intro') || document.querySelector('.section-content-edit');
        if (editorToFocus) {
            editorToFocus.focus();
            lastFocusedEditable = editorToFocus;
            return true;
        }
        
        alert("표를 삽입할 편집 영역을 먼저 클릭해주세요.");
        return false;
    }

    // 지정된 크기로 표 삽입
    function insertTableWithSize(rows, cols) {
        if (!restoreFocus()) return;

        let tableHTML = '<table style="border-collapse: collapse; width: 100%; margin: 1rem 0;">';
        
        for (let i = 0; i < rows; i++) {
            tableHTML += '<tr>';
            for (let j = 0; j < cols; j++) {
                if (i === 0) {
                    tableHTML += '<th style="border: 1px solid #ccc; padding: 8px; background-color: rgba(0,0,0,0.05); font-weight: 600;">헤더</th>';
                } else {
                    tableHTML += '<td style="border: 1px solid #ccc; padding: 8px; background-color: #ffffff;">내용</td>';
                }
            }
            tableHTML += '</tr>';
        }
        
        tableHTML += '</table><br>';
        document.execCommand('insertHTML', false, tableHTML);
        
        // 삽입된 테이블에 리사이즈 핸들 추가
        setTimeout(() => {
            const insertedTable = lastFocusedEditable?.querySelector('table:last-of-type');
            if (insertedTable) {
                addTableResizeHandles(insertedTable);
            }
        }, 100);
    }
    
    // 사용자 정의 표 삽입
    function insertCustomTable() {
        const rows = prompt('행 수를 입력하세요:', '3');
        const cols = prompt('열 수를 입력하세요:', '3');
        
        if (rows && cols && !isNaN(rows) && !isNaN(cols)) {
            const numRows = Math.max(1, Math.min(20, parseInt(rows)));
            const numCols = Math.max(1, Math.min(10, parseInt(cols)));
            insertTableWithSize(numRows, numCols);
        }
    }
    
    // 이미지 업로드 기능
    if (imageUploadBtn && imageUploadInput) {
        imageUploadBtn.addEventListener('click', function() {
            imageUploadInput.click();
        });
        
        imageUploadInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file && file.type.startsWith('image/')) {
                handleImageUpload(file);
            }
        });
    }
    
    // 이미지 처리 함수
    function handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageDataURL = e.target.result;
            insertImage(imageDataURL, file.name);
        };
        reader.readAsDataURL(file);
    }
    
    // 이미지 삽입 함수
    function insertImage(src, alt) {
        if (!restoreFocus()) return;

        const imageHTML = `
            <figure class="image-container" style="margin: 1rem 0; text-align: center;">
                <img src="${src}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <figcaption class="image-caption" style="margin-top: 0.5rem; font-size: 0.875rem; color: #666; font-style: italic;">${alt}&nbsp;</figcaption>
            </figure>
            <p><br></p>
        `;
        
        document.execCommand('insertHTML', false, imageHTML);
    }
    
    // execCommand 실행 함수
    function executeCommand(command, value = null) {
        if (!restoreFocus()) return;
        
        try {
            console.log(`Executing command: ${command}, value: ${value}`);
            document.execCommand(command, false, value);
        } catch (error) {
            console.error(`Error executing command ${command}:`, error);
        }
    }
    
    // 링크 생성 함수
    function createLink() {
        if (!restoreFocus()) return;
        const url = prompt('링크 URL을 입력하세요:', 'https://');
        if (url) {
            document.execCommand('createLink', false, url);
        }
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
                <h4>${sectionName}</h4>
                <button type="button" class="remove-section" title="섹션 삭제">×</button>
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
        const intro = document.getElementById('page-intro').innerHTML.trim();
        
        const sections = [];
        document.querySelectorAll('.section-template').forEach(section => {
            const sectionTitleEl = section.querySelector('.section-header-edit h4, .section-header-edit h3');
            const sectionTitle = sectionTitleEl ? sectionTitleEl.textContent : 'Untitled';
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
            intro,
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
                            </div>\n\n`;
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

                    ${data.intro ? `<!-- 페이지 소개 영역 -->
                    <div class="page-intro-section">
                        <div class="page-intro-content">
                            ${data.intro}
                        </div>
                    </div>` : ''}

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
    
    // 데이터 생성 버튼에 저장 기능 추가
    generateBtn.addEventListener('click', function() {
        const formData = collectFormData();
        if (validateFormData(formData)) {
            // 현재 페이지 데이터를 localStorage에 저장
            const pageData = getCurrentPageData();
            const savedPageId = savePageData(pageData);
            
            if (savedPageId) {
                // 기존 generate 기능 실행
                const searchData = JSON.stringify(formData, null, 2);
                const htmlContent = generateHtmlContent(formData);
                displayOutput(searchData, htmlContent);
                outputSection.style.display = 'block';
                
                // 저장 완료 알림
                alert(`페이지가 저장되었습니다! (ID: ${savedPageId})`);
            } else {
                alert('페이지 저장 중 오류가 발생했습니다.');
            }
        }
    });

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

    // ========== 요소 선택 및 속성 편집 시스템 ==========
    
    // 요소 선택 시스템 초기화
    function initElementSelection() {
        // contenteditable 영역에서 이미지와 테이블 클릭 감지
        document.addEventListener('click', function(e) {
            const target = e.target;
            
            // 셀 클릭 처리
            if (target.tagName === 'TD' || target.tagName === 'TH') {
                console.log('Cell clicked:', target);
                e.preventDefault();
                e.stopPropagation();
                
                const editableParent = target.closest('[contenteditable="true"]');
                console.log('Editable parent found:', editableParent);
                if (editableParent) {
                    if (e.shiftKey && selectedCells.length > 0) {
                        // Shift+클릭으로 범위 선택
                        selectCellRange(selectionStartCell, target);
                    } else {
                        // 단일 셀 선택
                        console.log('Calling selectCell with:', target);
                        selectCell(target);
                    }
                }
            }
            // 이미지 선택
            else if (target.tagName === 'IMG') {
                e.preventDefault();
                e.stopPropagation();
                
                const editableParent = target.closest('[contenteditable="true"]');
                if (editableParent) {
                    selectElement(target);
                }
            }
            // 테이블 전체 선택 (빈 영역 클릭시)
            else if (target.tagName === 'TABLE') {
                e.preventDefault();
                e.stopPropagation();
                
                const editableParent = target.closest('[contenteditable="true"]');
                if (editableParent) {
                    selectElement(target);
                }
            }
            // 다른 곳 클릭시 선택 해제
            else if (!target.closest('.property-panel')) {
                clearSelection();
            }
        });
        
        // 셀 범위 선택을 위한 마우스 이벤트
        document.addEventListener('mousedown', function(e) {
            if (e.target.tagName === 'TD' || e.target.tagName === 'TH') {
                const editableParent = e.target.closest('[contenteditable="true"]');
                if (editableParent && !e.shiftKey) {
                    isSelectingCells = true;
                    selectionStartCell = e.target;
                }
            }
        });
        
        document.addEventListener('mouseover', function(e) {
            if (isSelectingCells && (e.target.tagName === 'TD' || e.target.tagName === 'TH')) {
                const editableParent = e.target.closest('[contenteditable="true"]');
                if (editableParent && selectionStartCell) {
                    selectCellRange(selectionStartCell, e.target);
                }
            }
        });
        
        document.addEventListener('mouseup', function(e) {
            isSelectingCells = false;
        });
    }
    
    // 요소 선택
    function selectElement(element) {
        clearSelection();
        selectedElement = element;
        element.classList.add('element-selected');
        
        // 선택시 바로 속성 패널 열기
        openPropertyPanel(element);
        
        console.log('Element selected:', element);
    }
    
    // 단일 셀 선택
    function selectCell(cell) {
        console.log('selectCell function called with:', cell);
        clearSelection();
        selectedCells = [cell];
        selectionStartCell = cell;
        cell.classList.add('cell-selected');
        
        // 셀 속성 패널 열기
        console.log('Opening cell property panel...');
        openCellPropertyPanel(cell);
        
        console.log('Cell selected:', cell);
    }
    
    // 셀 범위 선택
    function selectCellRange(startCell, endCell) {
        if (!startCell || !endCell) return;
        
        clearCellSelection();
        
        const table = startCell.closest('table');
        if (!table || table !== endCell.closest('table')) return;
        
        const cells = Array.from(table.querySelectorAll('td, th'));
        const startIndex = cells.indexOf(startCell);
        const endIndex = cells.indexOf(endCell);
        
        const startRow = startCell.parentElement.rowIndex;
        const endRow = endCell.parentElement.rowIndex;
        const startCol = startCell.cellIndex;
        const endCol = endCell.cellIndex;
        
        const minRow = Math.min(startRow, endRow);
        const maxRow = Math.max(startRow, endRow);
        const minCol = Math.min(startCol, endCol);
        const maxCol = Math.max(startCol, endCol);
        
        selectedCells = [];
        
        for (let row = minRow; row <= maxRow; row++) {
            const tableRow = table.rows[row];
            for (let col = minCol; col <= maxCol; col++) {
                const cell = tableRow.cells[col];
                if (cell) {
                    selectedCells.push(cell);
                    cell.classList.add('cell-range-selected');
                }
            }
        }
        
        // 다중 셀 선택시 병합 옵션 표시
        openMultiCellPropertyPanel(selectedCells);
        
        console.log('Cell range selected:', selectedCells.length, 'cells');
    }
    
    // 셀 선택 해제
    function clearCellSelection() {
        selectedCells.forEach(cell => {
            cell.classList.remove('cell-selected', 'cell-range-selected');
        });
        selectedCells = [];
    }
    
    // 선택 해제
    function clearSelection() {
        if (selectedElement) {
            selectedElement.classList.remove('element-selected');
            selectedElement = null;
        }
        clearCellSelection();
        closePropertyPanel();
    }
    
    // 속성 패널 열기
    function openPropertyPanel(element) {
        if (element.tagName === 'IMG') {
            openImagePropertyPanel(element);
        } else if (element.tagName === 'TABLE') {
            openTablePropertyPanel(element);
        }
        propertyPanel.classList.add('show');
    }
    
    // 속성 패널 닫기
    function closePropertyPanel() {
        propertyPanel.classList.remove('show');
        showEmptyState();
    }
    
    // 빈 상태 표시
    function showEmptyState() {
        propertyTitle.textContent = '속성 편집';
        propertyContent.innerHTML = `
            <div class="property-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="9" cy="9" r="2"></circle>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
                <p>이미지나 표를 클릭하면<br>속성을 편집할 수 있습니다</p>
            </div>
        `;
    }
    
    // 이미지 속성 패널
    function openImagePropertyPanel(img) {
        propertyTitle.textContent = '이미지 속성';
        
        const currentStyle = img.style;
        const computedStyle = getComputedStyle(img);
        
        propertyContent.innerHTML = `
            <div class="property-group">
                <label>너비</label>
                <div class="property-row">
                    <div class="property-group">
                        <input type="number" class="property-input" id="img-width" value="${parseInt(currentStyle.width) || parseInt(computedStyle.width) || ''}" placeholder="자동">
                    </div>
                    <div class="property-group">
                        <select class="property-select" id="img-width-unit">
                            <option value="px" ${(currentStyle.width && currentStyle.width.includes('px')) ? 'selected' : ''}>px</option>
                            <option value="%" ${(currentStyle.width && currentStyle.width.includes('%')) ? 'selected' : ''}>%</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="property-group">
                <label>높이</label>
                <div class="property-row">
                    <div class="property-group">
                        <input type="number" class="property-input" id="img-height" value="${parseInt(currentStyle.height) || parseInt(computedStyle.height) || ''}" placeholder="자동">
                    </div>
                    <div class="property-group">
                        <select class="property-select" id="img-height-unit">
                            <option value="px" ${(currentStyle.height && currentStyle.height.includes('px')) ? 'selected' : ''}>px</option>
                            <option value="%" ${(currentStyle.height && currentStyle.height.includes('%')) ? 'selected' : ''}>%</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="property-group">
                <label>정렬</label>
                <select class="property-select" id="img-align">
                    <option value="left" ${currentStyle.float === 'left' ? 'selected' : ''}>왼쪽</option>
                    <option value="center" ${(!currentStyle.float && currentStyle.display === 'block' && currentStyle.margin === '0px auto') ? 'selected' : ''}>가운데</option>
                    <option value="right" ${currentStyle.float === 'right' ? 'selected' : ''}>오른쪽</option>
                    <option value="none" ${!currentStyle.float ? 'selected' : ''}>없음</option>
                </select>
            </div>
            
            <div class="property-group">
                <label>테두리</label>
                <div class="property-row">
                    <div class="property-group">
                        <input type="number" class="property-input" id="img-border-width" value="${parseInt(currentStyle.borderWidth) || 0}" min="0">
                    </div>
                    <div class="property-group">
                        <select class="property-select" id="img-border-style">
                            <option value="none" ${currentStyle.borderStyle === 'none' ? 'selected' : ''}>없음</option>
                            <option value="solid" ${currentStyle.borderStyle === 'solid' || !currentStyle.borderStyle ? 'selected' : ''}>실선</option>
                            <option value="dashed" ${currentStyle.borderStyle === 'dashed' ? 'selected' : ''}>점선</option>
                            <option value="dotted" ${currentStyle.borderStyle === 'dotted' ? 'selected' : ''}>점</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="property-group">
                <label>테두리 색상</label>
                <div class="property-color-picker">
                    <input type="color" class="property-color-input" id="img-border-color" value="${rgbToHex(currentStyle.borderColor) || '#000000'}">
                    <input type="text" class="property-input" value="${currentStyle.borderColor || '#000000'}" readonly>
                </div>
            </div>
            
            <div class="property-group">
                <label>모서리 둥글기</label>
                <input type="number" class="property-input" id="img-border-radius" value="${parseInt(currentStyle.borderRadius) || 0}" min="0">
            </div>
        `;
        
        // 실시간 변경 이벤트 추가
        addImagePropertyListeners();
    }
    
    // 이미지 속성 실시간 변경 리스너
    function addImagePropertyListeners() {
        // 모든 input과 select 요소에 이벤트 추가
        const inputs = propertyContent.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', applyImagePropertiesRealtime);
            input.addEventListener('change', applyImagePropertiesRealtime);
        });
    }
    
    // 실시간 이미지 속성 적용
    function applyImagePropertiesRealtime() {
        if (!selectedElement || selectedElement.tagName !== 'IMG') return;
        
        const img = selectedElement;
        
        const width = document.getElementById('img-width')?.value;
        const widthUnit = document.getElementById('img-width-unit')?.value;
        const height = document.getElementById('img-height')?.value;
        const heightUnit = document.getElementById('img-height-unit')?.value;
        const align = document.getElementById('img-align')?.value;
        const borderWidth = document.getElementById('img-border-width')?.value;
        const borderStyle = document.getElementById('img-border-style')?.value;
        const borderColor = document.getElementById('img-border-color')?.value;
        const borderRadius = document.getElementById('img-border-radius')?.value;
        
        // 크기 설정
        if (width && widthUnit) {
            img.style.width = width + widthUnit;
        } else if (!width) {
            img.style.width = '';
        }
        
        if (height && heightUnit) {
            img.style.height = height + heightUnit;
        } else if (!height) {
            img.style.height = '';
        }
        
        // 정렬 설정
        img.style.float = '';
        img.style.display = '';
        img.style.margin = '';

        const outsideMargin = '-1.5rem'; // --spacing-lg padding에 해당
        
        switch(align) {
            case 'left':
                img.style.float = 'left';
                img.style.margin = `0 1.5rem 1rem ${outsideMargin}`;
                break;
            case 'right':
                img.style.float = 'right';
                img.style.margin = `0 ${outsideMargin} 1rem 1.5rem`;
                break;
            case 'center':
                img.style.display = 'block';
                img.style.margin = '1rem auto';
                break;
            default:
                img.style.margin = '0';
        }
        
        // 테두리 설정
        if (borderWidth && borderStyle && borderStyle !== 'none') {
            img.style.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
        } else {
            img.style.border = '';
        }
        
        // 모서리 둥글기
        if (borderRadius) {
            img.style.borderRadius = borderRadius + 'px';
        } else {
            img.style.borderRadius = '';
        }
    }
    
    // 테이블 속성 패널 (탭 구조)
    function openTablePropertyPanel(table) {
        propertyTitle.textContent = '테이블 속성';
        
        // 테이블 선택시 리사이즈 핸들 추가
        addTableResizeHandles(table);
        
        const currentStyle = table.style;
        const computedStyle = getComputedStyle(table);
        
        propertyContent.innerHTML = `
            <div class="property-tabs">
                <button class="property-tab active" data-tab="table">전체</button>
                <button class="property-tab" data-tab="structure">구조</button>
            </div>
            
            <div class="property-tab-content active" id="table-tab">
                <div class="property-group">
                    <label>너비</label>
                    <div class="property-row">
                        <div class="property-group">
                            <input type="number" class="property-input" id="table-width" value="${parseInt(currentStyle.width) || parseInt(computedStyle.width) || ''}" placeholder="자동">
                        </div>
                        <div class="property-group">
                            <select class="property-select" id="table-width-unit">
                                <option value="px" ${(currentStyle.width && currentStyle.width.includes('px')) ? 'selected' : ''}>px</option>
                                <option value="%" ${(currentStyle.width && currentStyle.width.includes('%')) ? 'selected' : ''}>%</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="property-group">
                    <label>테두리 두께</label>
                    <input type="number" class="property-input" id="table-border-width" value="${parseInt(currentStyle.borderWidth) || parseInt(computedStyle.borderWidth) || 1}" min="0">
                </div>
                
                <div class="property-group">
                    <label>테두리 스타일</label>
                    <select class="property-select" id="table-border-style">
                        <option value="none" ${currentStyle.borderStyle === 'none' ? 'selected' : ''}>없음</option>
                        <option value="solid" ${currentStyle.borderStyle === 'solid' || !currentStyle.borderStyle ? 'selected' : ''}>실선</option>
                        <option value="dashed" ${currentStyle.borderStyle === 'dashed' ? 'selected' : ''}>점선</option>
                        <option value="dotted" ${currentStyle.borderStyle === 'dotted' ? 'selected' : ''}>점</option>
                    </select>
                </div>
                
                <div class="property-group">
                    <label>테두리 색상</label>
                    <div class="property-color-picker">
                        <input type="color" class="property-color-input" id="table-border-color" value="${rgbToHex(currentStyle.borderColor) || rgbToHex(computedStyle.borderColor) || '#cccccc'}">
                        <input type="text" class="property-input" value="${currentStyle.borderColor || computedStyle.borderColor || '#cccccc'}" readonly>
                    </div>
                </div>
                
                <div class="property-group">
                    <label>배경색</label>
                    <div class="property-color-picker">
                        <input type="color" class="property-color-input" id="table-bg-color" value="${rgbToHex(currentStyle.backgroundColor) || '#ffffff'}">
                        <input type="text" class="property-input" value="${currentStyle.backgroundColor || '#ffffff'}" readonly>
                    </div>
                </div>
                
                <div class="property-group">
                    <label>셀 패딩</label>
                    <input type="number" class="property-input" id="table-cell-padding" value="${parseInt(currentStyle.padding) || 8}" min="0">
                </div>
                
                <div class="property-group">
                    <div class="property-checkbox">
                        <input type="checkbox" id="table-border-collapse" ${currentStyle.borderCollapse === 'collapse' || computedStyle.borderCollapse === 'collapse' ? 'checked' : ''}>
                        <label>테두리 병합</label>
                    </div>
                </div>
            </div>
            
            <div class="property-tab-content" id="structure-tab">
                <div class="property-group">
                    <label>행/열 관리</label>
                    <div class="property-row">
                        <button class="btn-secondary" style="flex:1" onclick="insertTableRow()">행 추가</button>
                        <button class="btn-secondary" style="flex:1" onclick="insertTableColumn()">열 추가</button>
                    </div>
                    <div class="property-row" style="margin-top: var(--spacing-sm)">
                        <button class="btn-secondary" style="flex:1" onclick="deleteTableRow()">행 삭제</button>
                        <button class="btn-secondary" style="flex:1" onclick="deleteTableColumn()">열 삭제</button>
                    </div>
                </div>
            </div>
        `;
        
        // 탭 전환 이벤트 추가
        addTableTabListeners();
        // 실시간 변경 이벤트 추가
        addTablePropertyListeners();
    }
    
    // 셀 속성 패널 (테이블과 셀 속성을 모두 표시)
    function openCellPropertyPanel(cell) {
        console.log('openCellPropertyPanel called with cell:', cell);
        propertyTitle.textContent = '표 & 셀 속성';
        
        const table = cell.closest('table');
        console.log('Found table:', table);
        
        const currentCellStyle = cell.style;
        const computedCellStyle = getComputedStyle(cell);
        const currentTableStyle = table.style;
        const computedTableStyle = getComputedStyle(table);
        
        propertyContent.innerHTML = `
            <div class="property-tabs">
                <button class="property-tab active" data-tab="cell">선택된 셀</button>
                <button class="property-tab" data-tab="table">전체 표</button>
            </div>
            
            <div class="property-tab-content active" id="cell-tab">
                <div class="property-group">
                    <label>너비</label>
                    <div class="property-row">
                        <div class="property-group">
                            <input type="number" class="property-input" id="cell-width" value="${parseInt(currentCellStyle.width) || parseInt(computedCellStyle.width) || ''}" placeholder="자동">
                        </div>
                        <div class="property-group">
                            <select class="property-select" id="cell-width-unit">
                                <option value="px" ${(currentCellStyle.width && currentCellStyle.width.includes('px')) ? 'selected' : ''}>px</option>
                                <option value="%" ${(currentCellStyle.width && currentCellStyle.width.includes('%')) ? 'selected' : ''}>%</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="property-group">
                    <label>높이</label>
                    <div class="property-row">
                        <div class="property-group">
                            <input type="number" class="property-input" id="cell-height" value="${parseInt(currentCellStyle.height) || parseInt(computedCellStyle.height) || ''}" placeholder="자동">
                        </div>
                        <div class="property-group">
                            <select class="property-select" id="cell-height-unit">
                                <option value="px" ${(currentCellStyle.height && currentCellStyle.height.includes('px')) ? 'selected' : ''}>px</option>
                                <option value="%" ${(currentCellStyle.height && currentCellStyle.height.includes('%')) ? 'selected' : ''}>%</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="property-group">
                    <label>텍스트 정렬</label>
                    <select class="property-select" id="cell-text-align">
                        <option value="left" ${currentCellStyle.textAlign === 'left' || !currentCellStyle.textAlign ? 'selected' : ''}>왼쪽</option>
                        <option value="center" ${currentCellStyle.textAlign === 'center' ? 'selected' : ''}>가운데</option>
                        <option value="right" ${currentCellStyle.textAlign === 'right' ? 'selected' : ''}>오른쪽</option>
                    </select>
                </div>
                
                <div class="property-group">
                    <label>수직 정렬</label>
                    <select class="property-select" id="cell-vertical-align">
                        <option value="top" ${currentCellStyle.verticalAlign === 'top' ? 'selected' : ''}>위</option>
                        <option value="middle" ${currentCellStyle.verticalAlign === 'middle' || !currentCellStyle.verticalAlign ? 'selected' : ''}>중앙</option>
                        <option value="bottom" ${currentCellStyle.verticalAlign === 'bottom' ? 'selected' : ''}>아래</option>
                    </select>
                </div>
                
                <div class="property-group">
                    <label>배경색</label>
                    <div class="property-color-picker">
                        <input type="color" class="property-color-input" id="cell-bg-color" value="${rgbToHex(currentCellStyle.backgroundColor) || '#ffffff'}">
                        <input type="text" class="property-input" value="${currentCellStyle.backgroundColor || '#ffffff'}" readonly>
                    </div>
                </div>
                
                <div class="property-group">
                    <label>패딩</label>
                    <input type="number" class="property-input" id="cell-padding" value="${parseInt(currentCellStyle.padding) || 8}" min="0">
                </div>
                
                <div class="property-group">
                    <label>테두리 두께</label>
                    <input type="number" class="property-input" id="cell-border-width" value="${parseInt(currentCellStyle.borderWidth) || parseInt(computedCellStyle.borderWidth) || 1}" min="0">
                </div>
                
                <div class="property-group">
                    <label>테두리 색상</label>
                    <div class="property-color-picker">
                        <input type="color" class="property-color-input" id="cell-border-color" value="${rgbToHex(currentCellStyle.borderColor) || rgbToHex(computedCellStyle.borderColor) || '#cccccc'}">
                        <input type="text" class="property-input" value="${currentCellStyle.borderColor || computedCellStyle.borderColor || '#cccccc'}" readonly>
                    </div>
                </div>
            </div>
            
            <div class="property-tab-content" id="table-tab">
                <div class="property-group">
                    <label>표 너비</label>
                    <div class="property-row">
                        <div class="property-group">
                            <input type="number" class="property-input" id="table-width" value="${parseInt(currentTableStyle.width) || parseInt(computedTableStyle.width) || ''}" placeholder="자동">
                        </div>
                        <div class="property-group">
                            <select class="property-select" id="table-width-unit">
                                <option value="px" ${(currentTableStyle.width && currentTableStyle.width.includes('px')) ? 'selected' : ''}>px</option>
                                <option value="%" ${(currentTableStyle.width && currentTableStyle.width.includes('%')) ? 'selected' : ''}>%</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="property-group">
                    <label>표 배경색</label>
                    <div class="property-color-picker">
                        <input type="color" class="property-color-input" id="table-bg-color" value="${rgbToHex(currentTableStyle.backgroundColor) || '#ffffff'}">
                        <input type="text" class="property-input" value="${currentTableStyle.backgroundColor || '#ffffff'}" readonly>
                    </div>
                </div>
                
                <div class="property-group">
                    <label>표 테두리 두께</label>
                    <input type="number" class="property-input" id="table-border-width" value="${parseInt(currentTableStyle.borderWidth) || parseInt(computedTableStyle.borderWidth) || 1}" min="0">
                </div>
                
                <div class="property-group">
                    <label>표 테두리 색상</label>
                    <div class="property-color-picker">
                        <input type="color" class="property-color-input" id="table-border-color" value="${rgbToHex(currentTableStyle.borderColor) || rgbToHex(computedTableStyle.borderColor) || '#cccccc'}">
                        <input type="text" class="property-input" value="${currentTableStyle.borderColor || computedTableStyle.borderColor || '#cccccc'}" readonly>
                    </div>
                </div>
                
                <div class="property-group">
                    <label>모든 셀 패딩</label>
                    <input type="number" class="property-input" id="table-cell-padding" value="${parseInt(currentTableStyle.padding) || 8}" min="0">
                </div>
                
                <div class="property-group">
                    <div class="property-checkbox">
                        <input type="checkbox" id="table-border-collapse" ${currentTableStyle.borderCollapse === 'collapse' || computedTableStyle.borderCollapse === 'collapse' ? 'checked' : ''}>
                        <label>테두리 병합</label>
                    </div>
                </div>
                
                <div class="property-group">
                    <label>행/열 관리</label>
                    <div class="property-row">
                        <button class="btn-secondary" style="flex:1" onclick="insertTableRow()">행 추가</button>
                        <button class="btn-secondary" style="flex:1" onclick="insertTableColumn()">열 추가</button>
                    </div>
                    <div class="property-row" style="margin-top: var(--spacing-sm)">
                        <button class="btn-secondary" style="flex:1" onclick="deleteTableRow()">행 삭제</button>
                        <button class="btn-secondary" style="flex:1" onclick="deleteTableColumn()">열 삭제</button>
                    </div>
                </div>
            </div>
        `;
        
        // 탭 전환 이벤트 추가
        addTableTabListeners();
        // 실시간 변경 이벤트 추가
        addCellAndTablePropertyListeners();
        
        // 패널 표시
        console.log('Showing property panel...');
        propertyPanel.classList.add('show');
        console.log('Property panel classes after show:', propertyPanel.classList);
    }
    
    // 다중 셀 속성 패널 (병합 기능)
    function openMultiCellPropertyPanel(cells) {
        propertyTitle.textContent = `셀 속성 (${cells.length}개 선택)`;
        
        propertyContent.innerHTML = `
            <div class="property-group">
                <label>셀 병합</label>
                <button class="btn-primary" style="width: 100%" onclick="mergeCells()">선택된 셀 병합</button>
            </div>
            
            <div class="property-group">
                <label>일괄 배경색</label>
                <div class="property-color-picker">
                    <input type="color" class="property-color-input" id="multi-cell-bg-color" value="#ffffff">
                    <input type="text" class="property-input" value="#ffffff" readonly>
                </div>
            </div>
            
            <div class="property-group">
                <label>일괄 텍스트 정렬</label>
                <select class="property-select" id="multi-cell-text-align">
                    <option value="left">왼쪽</option>
                    <option value="center">가운데</option>
                    <option value="right">오른쪽</option>
                </select>
            </div>
            
            <div class="property-group">
                <label>일괄 패딩</label>
                <input type="number" class="property-input" id="multi-cell-padding" value="8" min="0">
            </div>
        `;
        
        // 일괄 변경 이벤트 추가
        addMultiCellPropertyListeners();
    }
    
    // 테이블 탭 리스너
    function addTableTabListeners() {
        const tabButtons = propertyContent.querySelectorAll('.property-tab');
        const tabContents = propertyContent.querySelectorAll('.property-tab-content');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const tabName = this.getAttribute('data-tab');
                
                // 모든 탭 비활성화
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // 선택된 탭 활성화
                this.classList.add('active');
                document.getElementById(`${tabName}-tab`).classList.add('active');
            });
        });
    }
    
    // 테이블 속성 실시간 변경 리스너
    function addTablePropertyListeners() {
        const inputs = propertyContent.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', applyTablePropertiesRealtime);
            input.addEventListener('change', applyTablePropertiesRealtime);
        });
    }
    
    // 셀 속성 실시간 변경 리스너
    function addCellPropertyListeners() {
        const inputs = propertyContent.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', applyCellPropertiesRealtime);
            input.addEventListener('change', applyCellPropertiesRealtime);
        });
    }
    
    // 다중 셀 속성 리스너
    function addMultiCellPropertyListeners() {
        const inputs = propertyContent.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', applyMultiCellPropertiesRealtime);
            input.addEventListener('change', applyMultiCellPropertiesRealtime);
        });
    }
    
    // 셀과 테이블 속성을 모두 처리하는 통합 리스너
    function addCellAndTablePropertyListeners() {
        const inputs = propertyContent.querySelectorAll('input, select');
        inputs.forEach(input => {
            const inputId = input.id;
            
            // 셀 속성인지 테이블 속성인지 구분하여 적절한 함수 호출
            if (inputId.startsWith('cell-')) {
                input.addEventListener('input', applyCellPropertiesRealtime);
                input.addEventListener('change', applyCellPropertiesRealtime);
            } else if (inputId.startsWith('table-')) {
                input.addEventListener('input', applyTablePropertiesRealtime);
                input.addEventListener('change', applyTablePropertiesRealtime);
            }
        });
    }
    
    // 실시간 테이블 속성 적용
    function applyTablePropertiesRealtime() {
        // 테이블이 직접 선택된 경우 또는 셀이 선택된 경우 모두 처리
        let table = null;
        if (selectedElement && selectedElement.tagName === 'TABLE') {
            table = selectedElement;
        } else if (selectedCells.length > 0) {
            table = selectedCells[0].closest('table');
        }
        
        if (!table) return;
        
        const width = document.getElementById('table-width')?.value;
        const widthUnit = document.getElementById('table-width-unit')?.value;
        const borderWidth = document.getElementById('table-border-width')?.value;
        const borderStyle = document.getElementById('table-border-style')?.value;
        const borderColor = document.getElementById('table-border-color')?.value;
        const bgColor = document.getElementById('table-bg-color')?.value;
        const cellPadding = document.getElementById('table-cell-padding')?.value;
        const borderCollapse = document.getElementById('table-border-collapse')?.checked;
        
        // 크기 설정
        if (width && widthUnit) {
            table.style.width = width + widthUnit;
        } else if (!width) {
            table.style.width = '';
        }
        
        // 테두리 설정
        if (borderWidth && borderStyle && borderStyle !== 'none') {
            table.style.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
            
            // 모든 셀에도 적용
            const cells = table.querySelectorAll('td, th');
            cells.forEach(cell => {
                cell.style.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
            });
        } else {
            table.style.border = '';
            const cells = table.querySelectorAll('td, th');
            cells.forEach(cell => {
                cell.style.border = '';
            });
        }
        
        // 배경색
        if (bgColor) {
            table.style.backgroundColor = bgColor;
        } else {
            table.style.backgroundColor = '#ffffff';
        }
        
        // 셀 패딩
        if (cellPadding) {
            const cells = table.querySelectorAll('td, th');
            cells.forEach(cell => {
                cell.style.padding = cellPadding + 'px';
            });
        }
        
        // 테두리 병합
        table.style.borderCollapse = borderCollapse ? 'collapse' : 'separate';
    }
    
    // RGB를 HEX로 변환
    function rgbToHex(rgb) {
        if (!rgb || rgb === 'transparent') return '#000000';
        
        const match = rgb.match(/\d+/g);
        if (!match) return rgb;
        
        const r = parseInt(match[0]);
        const g = parseInt(match[1]);
        const b = parseInt(match[2]);
        
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
    
    // 실시간 셀 속성 적용
    function applyCellPropertiesRealtime() {
        if (selectedCells.length !== 1) return;
        
        const cell = selectedCells[0];
        
        const width = document.getElementById('cell-width')?.value;
        const widthUnit = document.getElementById('cell-width-unit')?.value;
        const height = document.getElementById('cell-height')?.value;
        const heightUnit = document.getElementById('cell-height-unit')?.value;
        const textAlign = document.getElementById('cell-text-align')?.value;
        const verticalAlign = document.getElementById('cell-vertical-align')?.value;
        const bgColor = document.getElementById('cell-bg-color')?.value;
        const padding = document.getElementById('cell-padding')?.value;
        const borderWidth = document.getElementById('cell-border-width')?.value;
        const borderColor = document.getElementById('cell-border-color')?.value;
        
        // 크기 설정
        if (width && widthUnit) {
            cell.style.width = width + widthUnit;
        } else if (!width) {
            cell.style.width = '';
        }
        
        if (height && heightUnit) {
            cell.style.height = height + heightUnit;
        } else if (!height) {
            cell.style.height = '';
        }
        
        // 정렬 설정
        if (textAlign) {
            cell.style.textAlign = textAlign;
        }
        
        if (verticalAlign) {
            cell.style.verticalAlign = verticalAlign;
        }
        
        // 배경색
        if (bgColor) {
            cell.style.backgroundColor = bgColor;
        }
        
        // 패딩
        if (padding) {
            cell.style.padding = padding + 'px';
        }
        
        // 테두리
        if (borderWidth && borderColor) {
            cell.style.border = `${borderWidth}px solid ${borderColor}`;
        }
    }
    
    // 다중 셀 속성 일괄 적용
    function applyMultiCellPropertiesRealtime() {
        if (selectedCells.length === 0) return;
        
        const bgColor = document.getElementById('multi-cell-bg-color')?.value;
        const textAlign = document.getElementById('multi-cell-text-align')?.value;
        const padding = document.getElementById('multi-cell-padding')?.value;
        
        selectedCells.forEach(cell => {
            if (bgColor) {
                cell.style.backgroundColor = bgColor;
            }
            
            if (textAlign) {
                cell.style.textAlign = textAlign;
            }
            
            if (padding) {
                cell.style.padding = padding + 'px';
            }
        });
    }
    

    // 속성 패널 이벤트 리스너들
    if (propertyClose) {
        propertyClose.addEventListener('click', function() {
            clearSelection();
        });
    }
    
    // 이미지 속성 적용
    function applyImageProperties() {
        const img = selectedElement;
        
        const width = document.getElementById('img-width').value;
        const widthUnit = document.getElementById('img-width-unit').value;
        const height = document.getElementById('img-height').value;
        const heightUnit = document.getElementById('img-height-unit').value;
        const align = document.getElementById('img-align').value;
        const borderWidth = document.getElementById('img-border-width').value;
        const borderStyle = document.getElementById('img-border-style').value;
        const borderColor = document.getElementById('img-border-color').value;
        const borderRadius = document.getElementById('img-border-radius').value;
        
        // 크기 설정
        if (width) {
            img.style.width = width + widthUnit;
        } else {
            img.style.width = '';
        }
        
        if (height) {
            img.style.height = height + heightUnit;
        } else {
            img.style.height = '';
        }
        
        // 정렬 설정
        img.style.float = '';
        img.style.display = '';
        img.style.margin = '';
        
        switch(align) {
            case 'left':
                img.style.float = 'left';
                break;
            case 'right':
                img.style.float = 'right';
                break;
            case 'center':
                img.style.display = 'block';
                img.style.margin = '0 auto';
                break;
        }
        
        // 테두리 설정
        if (borderWidth && borderStyle !== 'none') {
            img.style.border = `${borderWidth}px ${borderStyle} ${borderColor}`;
        } else {
            img.style.border = '';
        }
        
        // 모서리 둥글기
        if (borderRadius) {
            img.style.borderRadius = borderRadius + 'px';
        } else {
            img.style.borderRadius = '';
        }
    }

    // 테이블 구조 조작 함수들 (전역으로 정의)
    window.insertTableRow = function() {
        if (!selectedElement || selectedElement.tagName !== 'TABLE') {
            alert('테이블을 선택해주세요.');
            return;
        }
        
        const table = selectedElement;
        const newRow = table.insertRow(-1); // 마지막에 행 추가
        const colCount = table.rows[0].cells.length;
        
        for (let i = 0; i < colCount; i++) {
            const cell = newRow.insertCell(-1);
            cell.innerHTML = '새 행';
            cell.style.border = '1px solid #ccc';
            cell.style.padding = '8px';
            cell.style.backgroundColor = '#ffffff';
        }
        
        console.log('Table row inserted');
    };
    
    window.insertTableColumn = function() {
        if (!selectedElement || selectedElement.tagName !== 'TABLE') {
            alert('테이블을 선택해주세요.');
            return;
        }
        
        const table = selectedElement;
        const rows = table.rows;
        
        for (let i = 0; i < rows.length; i++) {
            const cell = rows[i].insertCell(-1);
            cell.innerHTML = i === 0 ? '새 열' : '내용';
            cell.style.border = '1px solid #ccc';
            cell.style.padding = '8px';
            cell.style.backgroundColor = '#ffffff';
            
            if (i === 0) {
                cell.style.backgroundColor = 'rgba(0,0,0,0.05)';
                cell.style.fontWeight = '600';
            }
        }
        
        console.log('Table column inserted');
    };
    
    window.deleteTableRow = function() {
        if (!selectedElement || selectedElement.tagName !== 'TABLE') {
            alert('테이블을 선택해주세요.');
            return;
        }
        
        const table = selectedElement;
        if (table.rows.length <= 1) {
            alert('테이블에는 최소 1개의 행이 필요합니다.');
            return;
        }
        
        table.deleteRow(-1); // 마지막 행 삭제
        console.log('Table row deleted');
    };
    
    window.deleteTableColumn = function() {
        if (!selectedElement || selectedElement.tagName !== 'TABLE') {
            alert('테이블을 선택해주세요.');
            return;
        }
        
        const table = selectedElement;
        const rows = table.rows;
        
        if (rows.length === 0 || rows[0].cells.length <= 1) {
            alert('테이블에는 최소 1개의 열이 필요합니다.');
            return;
        }
        
        for (let i = 0; i < rows.length; i++) {
            rows[i].deleteCell(-1); // 마지막 열 삭제
        }
        
        console.log('Table column deleted');
    };
    
    // mergeCells 함수도 전역으로 정의
    window.mergeCells = function() {
        if (selectedCells.length < 2) {
            alert('병합할 셀을 2개 이상 선택해주세요.');
            return;
        }
        
        const table = selectedCells[0].closest('table');
        if (!table) return;
        
        // 선택된 셀들이 모두 같은 테이블에 속하는지 확인
        for (const cell of selectedCells) {
            if (cell.closest('table') !== table) {
                alert('같은 테이블의 셀만 병합할 수 있습니다.');
                return;
            }
        }
        
        // 첫 번째 셀을 기준으로 병합
        const targetCell = selectedCells[0];
        let mergedContent = '';
        
        // 모든 셀의 내용을 병합
        selectedCells.forEach((cell, index) => {
            if (cell.innerHTML.trim()) {
                if (mergedContent && mergedContent.trim()) {
                    mergedContent += ' ';
                }
                mergedContent += cell.innerHTML.trim();
            }
        });
        
        // 병합된 내용을 첫 번째 셀에 설정
        targetCell.innerHTML = mergedContent;
        
        // colspan과 rowspan 계산
        const positions = selectedCells.map(cell => ({
            row: cell.parentElement.rowIndex,
            col: cell.cellIndex,
            cell: cell
        }));
        
        const minRow = Math.min(...positions.map(p => p.row));
        const maxRow = Math.max(...positions.map(p => p.row));
        const minCol = Math.min(...positions.map(p => p.col));
        const maxCol = Math.max(...positions.map(p => p.col));
        
        const rowSpan = maxRow - minRow + 1;
        const colSpan = maxCol - minCol + 1;
        
        // 첫 번째 셀에 span 속성 설정
        if (rowSpan > 1) {
            targetCell.setAttribute('rowspan', rowSpan);
        }
        if (colSpan > 1) {
            targetCell.setAttribute('colspan', colSpan);
        }
        
        // 나머지 셀들 제거 (첫 번째 셀 제외)
        selectedCells.slice(1).forEach(cell => {
            cell.remove();
        });
        
        // 선택 상태 초기화
        clearSelection();
        
        alert(`셀이 성공적으로 병합되었습니다. (${rowSpan}행 × ${colSpan}열)`);
    };

    // 요소 선택 시스템 초기화
    initElementSelection();
});