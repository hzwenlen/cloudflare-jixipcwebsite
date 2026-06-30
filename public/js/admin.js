let ticketsData = [];
let currentEditId = null;
async function checkLogin() {
    const res = await fetch('/api/admin/check');
    const data = await res.json();
    if (!data.loggedIn) {
        document.getElementById('loginPanel').style.display = 'flex';
        document.getElementById('adminPanel').style.display = 'none';
    } else {
        document.getElementById('loginPanel').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadTickets();
        loadLogo();
    }
}
async function loadLogo() {
    const res = await fetch('/api/public/logo');
    const data = await res.json();
    if (data.url) document.getElementById('logoImg').src = data.url;
}
async function loadTickets() {
    try {
        const data = await apiRequest('/admin/tickets');
        ticketsData = data;
        renderTickets();
        updateStats();
        document.getElementById('loadingMsg').style.display = 'none';
    } catch (err) {
        document.getElementById('loadingMsg').innerText = '加载失败: ' + err.message;
    }
}
function renderTickets() {
    const tbody = document.getElementById('ticketList');
    if (!ticketsData.length) { tbody.innerHTML = '<tr><td colspan="12">暂无工单数据</td></tr>'; return; }
    tbody.innerHTML = ticketsData.map(t => `
        <tr>
            <td>${t.ticket_no}</td><td>${escapeHtml(t.customer_name)}</td><td>${t.phone || '-'}</td><td>${t.device_model || '-'}</td>
            <td>¥${Number(t.visit_fee).toFixed(2)}</td><td>¥${Number(t.inspect_fee).toFixed(2)}</td>
            <td>¥${Number(t.repair_cost).toFixed(2)}</td><td>¥${Number(t.parts_cost).toFixed(2)}</td>
            <td><strong>¥${Number(t.total_amount).toFixed(2)}</strong></td>
            <td><span class="status-badge ${t.payment_status === 1 ? 'status-paid' : 'status-unpaid'}">${t.payment_status === 1 ? '已收款' : '待收款'}</span></td>
            <td>${new Date(t.created_at).toLocaleDateString()}</td>
            <td>
                <button class="action-btn edit-btn" data-id="${t.id}"><i class="fas fa-edit"></i></button>
                <button class="action-btn receipt-btn" data-id="${t.id}"><i class="fas fa-receipt"></i> 收据</button>
                <button class="action-btn del-btn" data-id="${t.id}"><i class="fas fa-trash"></i></button>
              </td>
          </tr>
    `).join('');
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id))));
    document.querySelectorAll('.receipt-btn').forEach(btn => btn.addEventListener('click', () => showReceipt(parseInt(btn.dataset.id))));
    document.querySelectorAll('.del-btn').forEach(btn => btn.addEventListener('click', () => deleteTicket(parseInt(btn.dataset.id))));
}
function showReceipt(id) {
    const ticket = ticketsData.find(t => t.id === id);
    if (ticket) generateReceiptHTML(ticket);
    else alert('工单不存在');
}
async function deleteTicket(id) {
    if (confirm('确定删除此工单吗？')) {
        await apiRequest(`/admin/tickets/${id}`, { method: 'DELETE' });
        await loadTickets();
    }
}
function openEditModal(id) {
    const ticket = ticketsData.find(t => t.id === id);
    if (!ticket) return;
    currentEditId = id;
    document.getElementById('modalTitle').innerText = '编辑工单';
    document.getElementById('editId').value = ticket.id;
    document.getElementById('editName').value = ticket.customer_name;
    document.getElementById('editPhone').value = ticket.phone || '';
    document.getElementById('editDevice').value = ticket.device_model || '';
    document.getElementById('editFault').value = ticket.fault || '';
    document.getElementById('editVisitFee').value = ticket.visit_fee;
    document.getElementById('editInspectFee').value = ticket.inspect_fee;
    document.getElementById('editRepairCost').value = ticket.repair_cost;
    document.getElementById('editPartsCost').value = ticket.parts_cost;
    document.getElementById('editPayStatus').value = ticket.payment_status;
    document.getElementById('editModal').classList.remove('hidden');
}
function openCreateModal() {
    currentEditId = null;
    document.getElementById('modalTitle').innerText = '新建工单';
    document.getElementById('editForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('editName').value = '';
    document.getElementById('editPhone').value = '';
    document.getElementById('editDevice').value = '';
    document.getElementById('editFault').value = '';
    document.getElementById('editVisitFee').value = 0;
    document.getElementById('editInspectFee').value = 0;
    document.getElementById('editRepairCost').value = 0;
    document.getElementById('editPartsCost').value = 0;
    document.getElementById('editPayStatus').value = 0;
    document.getElementById('editModal').classList.remove('hidden');
}
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        customer_name: document.getElementById('editName').value,
        phone: document.getElementById('editPhone').value,
        device_model: document.getElementById('editDevice').value,
        fault: document.getElementById('editFault').value,
        visit_fee: parseFloat(document.getElementById('editVisitFee').value) || 0,
        inspect_fee: parseFloat(document.getElementById('editInspectFee').value) || 0,
        repair_cost: parseFloat(document.getElementById('editRepairCost').value) || 0,
        parts_cost: parseFloat(document.getElementById('editPartsCost').value) || 0,
        payment_status: parseInt(document.getElementById('editPayStatus').value)
    };
    if (currentEditId) {
        await apiRequest(`/admin/tickets/${currentEditId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
        await apiRequest('/admin/tickets', { method: 'POST', body: JSON.stringify(payload) });
    }
    closeModal();
    await loadTickets();
});
function closeModal() { document.getElementById('editModal').classList.add('hidden'); }
function updateStats() {
    document.getElementById('totalCount').innerText = ticketsData.length;
    const paid = ticketsData.filter(t => t.payment_status === 1).length;
    document.getElementById('paidCount').innerText = paid;
    document.getElementById('unpaidCount').innerText = ticketsData.length - paid;
}
document.getElementById('refreshBtn').addEventListener('click', loadTickets);
document.getElementById('createTicketBtn').addEventListener('click', openCreateModal);
document.getElementById('uploadLogoBtn').addEventListener('click', () => document.getElementById('logoFile').click());
document.getElementById('logoFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('logo', file);
    const res = await fetch('/api/admin/upload-logo', { method: 'POST', body: formData });
    if (res.ok) { alert('LOGO上传成功'); loadLogo(); } else alert('上传失败');
});
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.reload();
});
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (data.success) checkLogin();
    else alert('登录失败：' + data.message);
});
document.querySelectorAll('.close').forEach(btn => btn.addEventListener('click', closeModal));
checkLogin();
