import frappe

frappe.init(site="frontend", sites_path="sites")
frappe.connect()

company_name = "MerchantOS Demo"
from erpnext.accounts.doctype.account.chart_of_accounts.chart_of_accounts import create_charts
try:
    create_charts(company_name)
    frappe.db.commit()
    print("CHARTS_CREATED_SUCCESS")
except Exception as e:
    print("CHARTS_ERR:", e)

# Set default cost center and warehouse on Company
company = frappe.get_doc("Company", company_name)
cc = frappe.db.get_value("Cost Center", {"company": company_name, "is_group": 0}, "name")
if cc:
    company.cost_center = cc
    print("SET_COMPANY_COST_CENTER:", cc)

wh = frappe.db.get_value("Warehouse", {"company": company_name, "is_group": 0}, "name")
if wh:
    company.default_warehouse = wh
    print("SET_COMPANY_DEFAULT_WAREHOUSE:", wh)

income_acc = (
    frappe.db.get_value("Account", {"company": company_name, "account_name": "Sales", "is_group": 0}, "name")
    or frappe.db.get_value("Account", {"company": company_name, "account_type": "Income Account", "is_group": 0}, "name")
    or frappe.db.get_value("Account", {"company": company_name, "root_type": "Income", "is_group": 0}, "name")
)

expense_acc = (
    frappe.db.get_value("Account", {"company": company_name, "account_name": "Cost of Goods Sold", "is_group": 0}, "name")
    or frappe.db.get_value("Account", {"company": company_name, "account_type": "Expense Account", "is_group": 0}, "name")
    or frappe.db.get_value("Account", {"company": company_name, "root_type": "Expense", "is_group": 0}, "name")
)

stock_acc = frappe.db.get_value("Account", {"company": company_name, "account_type": "Stock", "is_group": 0}, "name")

if income_acc:
    company.default_income_account = income_acc
    print("SET_DEFAULT_INCOME_ACCOUNT:", income_acc)
if expense_acc:
    company.default_expense_account = expense_acc
    print("SET_DEFAULT_EXPENSE_ACCOUNT:", expense_acc)
if stock_acc:
    company.default_inventory_account = stock_acc
    print("SET_DEFAULT_INVENTORY_ACCOUNT:", stock_acc)

company.save(ignore_permissions=True)

# Link Mode of Payment -> Cash / Bank accounts for this company
cash_account = frappe.db.get_value("Account", {"company": company_name, "account_type": "Cash"}, "name")
bank_account = frappe.db.get_value("Account", {"company": company_name, "account_type": "Bank"}, "name")

modes = ["Cash", "Bank", "Credit Card", "Wire Transfer"]
for m_name in modes:
    if frappe.db.exists("Mode of Payment", m_name):
        doc = frappe.get_doc("Mode of Payment", m_name)
        has_company = any(acc.company == company_name for acc in doc.accounts)
        if not has_company:
            account_to_use = cash_account if m_name == "Cash" else (bank_account or cash_account)
            if account_to_use:
                doc.append("accounts", {
                    "company": company_name,
                    "default_account": account_to_use,
                })
                doc.save(ignore_permissions=True)
                print(f"LINKED_MODE_OF_PAYMENT: {m_name} -> {account_to_use}")

frappe.db.commit()

# Enable allow_negative_stock for retail POS flow
try:
    stock_settings = frappe.get_doc("Stock Settings")
    stock_settings.allow_negative_stock = 1
    stock_settings.save(ignore_permissions=True)
    frappe.db.commit()
    print("ENABLED_ALLOW_NEGATIVE_STOCK")
except Exception as e:
    print("ALLOW_NEGATIVE_STOCK_ERR:", e)

print("ERP_BOOTSTRAP_COMPLETE_SUCCESS")
