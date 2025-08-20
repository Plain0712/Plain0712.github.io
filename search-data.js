// 검색 데이터베이스
const searchData = [
    {
        id: 'swiss-typography',
        title: '스위스 타이포그래피',
        url: 'wiki.html',
        category: '디자인',
        description: '스위스 타이포그래피 또는 국제 타이포그래피 양식은 1950년대 스위스에서 시작된 그래픽 디자인 운동입니다.',
        keywords: ['스위스', '타이포그래피', '디자인', '헬베티카', '미니멀리즘', 'swiss', 'typography']
    },
    {
        id: 'github-pages',
        title: 'GitHub Pages 배포',
        url: '#',
        category: '기술',
        description: 'GitHub Pages를 이용한 정적 사이트 배포 방법과 설정에 대한 가이드입니다.',
        keywords: ['깃헙', 'github', 'pages', '배포', '호스팅', 'deploy']
    },
    {
        id: 'css-grid',
        title: 'CSS Grid Layout',
        url: '#',
        category: '기술',
        description: 'CSS Grid를 활용한 현대적인 웹 레이아웃 구성 방법에 대한 설명입니다.',
        keywords: ['css', 'grid', '그리드', '레이아웃', 'layout', '웹디자인']
    },
    {
        id: 'design-system',
        title: '디자인 시스템',
        url: '#',
        category: '디자인',
        description: '일관된 사용자 경험을 위한 디자인 시스템 구축과 관리 방법입니다.',
        keywords: ['디자인', '시스템', 'design', 'system', 'ui', 'ux', '컴포넌트']
    }
];

// 검색 함수
function searchContent(query) {
    if (!query || query.trim().length < 1) return [];
    
    const searchTerm = query.toLowerCase().trim();
    const results = [];
    
    searchData.forEach(item => {
        let score = 0;
        
        // 제목 검색 (가중치: 3)
        if (item.title.toLowerCase().includes(searchTerm)) {
            score += 3;
        }
        
        // 설명 검색 (가중치: 2)
        if (item.description.toLowerCase().includes(searchTerm)) {
            score += 2;
        }
        
        // 키워드 검색 (가중치: 1)
        item.keywords.forEach(keyword => {
            if (keyword.toLowerCase().includes(searchTerm)) {
                score += 1;
            }
        });
        
        if (score > 0) {
            results.push({
                ...item,
                score: score
            });
        }
    });
    
    // 점수순으로 정렬
    return results.sort((a, b) => b.score - a.score);
}

// 검색 결과 표시
function displaySearchResults(results, container) {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (results.length === 0) {
        container.innerHTML = '<div class="no-results">검색 결과가 없습니다.</div>';
        return;
    }
    
    const resultsList = document.createElement('div');
    resultsList.className = 'search-results';
    
    results.forEach(result => {
        const resultItem = document.createElement('a');
        resultItem.href = result.url;
        resultItem.className = 'search-result-item';
        
        resultItem.innerHTML = `
            <div class="result-title">${result.title}</div>
            <div class="result-category">${result.category}</div>
            <div class="result-description">${result.description}</div>
        `;
        
        resultsList.appendChild(resultItem);
    });
    
    container.appendChild(resultsList);
}

// 전역으로 함수 노출
window.searchContent = searchContent;
window.displaySearchResults = displaySearchResults;