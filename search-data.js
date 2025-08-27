// 검색 데이터베이스
const searchData = [
    {
        id: 'swiss-typography',
        title: '스위스 타이포그래피',
        url: 'wiki.html',
        category: '디자인',
        description: '스위스 타이포그래피 또는 국제 타이포그래피 양식은 1950년대 스위스에서 시작된 그래픽 디자인 운동입니다.',
        keywords: ['스위스', '타이포그래피', '디자인', '헬베티카', '미니멀리즘', 'swiss', 'typography'],
        lastModified: '2024-08-20',
        readTime: '5분'
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

// 최근 업데이트 페이지 가져오기 
function getRecentUpdates(limit = 3) {
    return [...searchData]
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))
        .slice(0, limit);
}

// 최근 업데이트 표시
function displayRecentUpdates(container) {
    if (!container) return;
    
    const recentItems = getRecentUpdates();
    container.innerHTML = '';
    
    if (recentItems.length === 0) {
        container.innerHTML = '<div class="no-recent">최근 업데이트된 페이지가 없습니다.</div>';
        return;
    }
    
    recentItems.forEach(item => {
        const recentItem = document.createElement('a');
        recentItem.href = item.url;
        recentItem.className = 'recent-item';
        
        const formattedDate = new Date(item.lastModified).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric'
        });
        
        recentItem.innerHTML = `
            <div class="recent-item-content">
                <div class="recent-title">${item.title}</div>
                <div class="recent-meta">
                    <span class="recent-category">${item.category}</span>
                    <span class="recent-date">${formattedDate}</span>
                    <span class="recent-read-time">${item.readTime} 읽기</span>
                </div>
            </div>
        `;
        
        container.appendChild(recentItem);
    });
}

// 전역으로 함수 노출
window.searchContent = searchContent;
window.displaySearchResults = displaySearchResults;
window.getRecentUpdates = getRecentUpdates;
window.displayRecentUpdates = displayRecentUpdates;