const API_BASE = '/api';
async function apiRequest(url, options = {}) {
    const response = await fetch(`${API_BASE}${url}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    if (!response.ok) {
        if (response.status === 401) window.location.href = '/admin.html';
        throw new Error(await response.text());
    }
    return response.json();
}
function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, function(m) { if (m === '&') return '&amp;'; if (m === '<') return '&lt;'; if (m === '>') return '&gt;'; return m; }); }

// 生成HTML收据（在新窗口打开，包含红色方形公章，分两行显示设备型号和故障描述，30天质保）
function generateReceiptHTML(ticket) {
    const win = window.open();
    win.document.write(`
        <!DOCTYPE html>
        <html><head><meta charset="UTF-8"><title>维修收据 - ${ticket.ticket_no}</title>
        <style>
            body { font-family: 'SimSun', '宋体', 'Microsoft YaHei', sans-serif; padding: 30px; background: #f0f0f0; }
            .receipt { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .header h1 { margin: 0; color: #b22222; }
            .header p { margin: 5px 0; color: #555; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 15px; background: #f9f9f9; padding: 10px; border-radius: 8px; }
            .info-block { margin-bottom: 15px; background: #f9f9f9; padding: 10px; border-radius: 8px; }
            .info-block div { margin-bottom: 8px; }
            .detail-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .detail-table th, .detail-table td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
            .detail-table th { background: #f2f2f2; }
            .total { font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 15px; padding-top: 10px; border-top: 2px solid #333; }
            .stamp-box { margin-top: 30px; display: flex; justify-content: flex-end; }
            .stamp-square {
                width: 120px;
                height: 120px;
                border: 3px solid #c00;
                display: flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                color: #c00;
                font-size: 14px;
                font-weight: bold;
                background: rgba(204,0,0,0.03);
                transform: rotate(-6deg);
                font-family: "SimHei", "Microsoft YaHei", sans-serif;
            }
            .stamp-square span { display: block; font-size: 16px; line-height: 1.4; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
            @media print { body { background: white; } .receipt { box-shadow: none; padding: 0; } .no-print { display: none; } }
        </style>
        </head>
        <body><div class="receipt">
            <div class="header"><h1>绩溪有佳电脑公司</h1><p>维修工单 · 收款收据</p><p>地址：绩溪县华阳镇华高路35号 | 电话：0563-0000000</p></div>
            <div class="info-row"><div><strong>工单号：</strong> ${ticket.ticket_no}</div><div><strong>创建日期：</strong> ${new Date(ticket.created_at).toLocaleString()}</div></div>
            <div class="info-row"><div><strong>客户姓名：</strong> ${escapeHtml(ticket.customer_name)}</div><div><strong>联系电话：</strong> ${ticket.phone || '未提供'}</div></div>
            <div class="info-block"><div><strong>设备型号：</strong> ${ticket.device_model || '—'}</div><div><strong>故障描述：</strong> ${ticket.fault || '—'}</div></div>
            <table class="detail-table">
                <tr><th>费用项目</th><th>金额（元）</th></tr>
                <tr><td>上门费</td><td>¥${Number(ticket.visit_fee).toFixed(2)}</td></tr>
                <tr><td>检测费</td><td>¥${Number(ticket.inspect_fee).toFixed(2)}</td></tr>
                <tr><td>维修费</td><td>¥${Number(ticket.repair_cost).toFixed(2)}</td></tr>
                <tr><td>配件费</td><td>¥${Number(ticket.parts_cost).toFixed(2)}</td></tr>
                <tr style="font-weight:bold; background:#fef9e6;"><td>合计金额</td><td>¥${Number(ticket.total_amount).toFixed(2)}</td></tr>
            </table>
            <div class="total">收款状态：${ticket.payment_status === 1 ? '已收款' : '待收款'}${ticket.payment_status === 1 && ticket.payment_date ? '（收款日期：' + new Date(ticket.payment_date).toLocaleString() + '）' : ''}</div>
            <div class="stamp-box"><div class="stamp-square"><span>绩溪有佳电脑<br>★‌★‌★‌★‌★‌★</span></div></div>
            <div class="footer"><p>本单据为维修凭证，享受30天质保服务。感谢您选择绩溪有佳电脑！</p></div>
        </div><div class="no-print" style="text-align:center; margin-top:20px;"><button onclick="window.print();">打印收据</button> <button onclick="window.close();">关闭</button></div></body></html>
    `);
    win.document.close();
}
